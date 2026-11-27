import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const UNSUPPORTED_COLOR_RE = /oklch\(|oklab\(|color-mix\(|\blch\(|\blab\(/i;

/**
 * Resolves ANY modern CSS color string (including Tailwind v4 `oklch(...)`,
 * `oklab(...)`, `color-mix(...)`, `lab(...)`, `lch(...)`) into a guaranteed
 * `rgba(r, g, b, a)` string that html2canvas v1.4.1 parses cleanly.
 */
function createColorResolver() {
  const cache = new Map<string, string>();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return (rawColor: string | null | undefined, fallback = 'rgba(0, 0, 0, 0)'): string => {
    if (!rawColor) return fallback;
    const trimmed = rawColor.trim();
    if (!trimmed || trimmed === 'none' || trimmed === 'transparent') {
      return 'rgba(0, 0, 0, 0)';
    }
    if (/^rgba?\(/i.test(trimmed) || /^#[0-9a-f]{3,8}$/i.test(trimmed)) {
      return trimmed;
    }
    const hit = cache.get(trimmed);
    if (hit) return hit;

    if (!ctx) return fallback;
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = trimmed;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const alpha = Math.round((a / 255) * 1000) / 1000;
      const resolved = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      cache.set(trimmed, resolved);
      return resolved;
    } catch {
      return fallback;
    }
  };
}

/**
 * Replaces balanced function calls like `color-mix(...)` or `oklch(...)`
 * even when they contain nested parentheses such as `var(--x)`.
 */
function replaceCssFunction(css: string, fnName: string, replacement: string): string {
  const lower = css.toLowerCase();
  const needle = `${fnName.toLowerCase()}(`;
  let out = '';
  let idx = 0;

  while (idx < css.length) {
    const start = lower.indexOf(needle, idx);
    if (start === -1) {
      out += css.slice(idx);
      break;
    }
    // Avoid matching inside identifiers like `my-lab(`
    if (start > 0 && /[a-z0-9_-]/i.test(css[start - 1])) {
      out += css.slice(idx, start + needle.length);
      idx = start + needle.length;
      continue;
    }

    out += css.slice(idx, start);
    let depth = 0;
    let pos = start + needle.length - 1; // points at '('
    while (pos < css.length) {
      const ch = css[pos];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          pos += 1;
          break;
        }
      }
      pos += 1;
    }
    out += replacement;
    idx = pos;
  }

  return out;
}

/**
 * Neutralizes all modern CSS color functions unsupported by html2canvas v1.4.1
 * across both inline `<style>` tags (dev mode) and bundled `<link rel="stylesheet">`
 * sheets (production Vite / Vercel builds).
 */
function sanitizeCssTextForCanvas(cssText: string): string {
  let cleaned = cssText;
  cleaned = replaceCssFunction(cleaned, 'color-mix', 'rgba(15, 23, 42, 0.08)');
  cleaned = replaceCssFunction(cleaned, 'oklch', '#0f172a');
  cleaned = replaceCssFunction(cleaned, 'oklab', '#0f172a');
  cleaned = replaceCssFunction(cleaned, 'lch', '#0f172a');
  cleaned = replaceCssFunction(cleaned, 'lab', '#0f172a');
  return cleaned;
}

/**
 * Extracts sanitized CSS text for same-origin `<link rel="stylesheet">` tags
 * so production Vite builds never fail inside html2canvas's CSS parser.
 */
function collectSanitizedLinkedCss(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      if (!sheet.href) continue;
      // Skip external font stylesheets (Google Fonts has no oklch rules)
      if (/fonts\.googleapis\.com/i.test(sheet.href)) continue;
      try {
        const rules = Array.from(sheet.cssRules || []);
        const raw = rules.map((r) => r.cssText).join('\n');
        if (UNSUPPORTED_COLOR_RE.test(raw)) {
          map.set(sheet.href, sanitizeCssTextForCanvas(raw));
        }
      } catch {
        // Cross-origin stylesheet — safe to skip
      }
    }
  } catch {
    // ignore
  }
  return map;
}

interface ColorSnapshot {
  color: string;
  backgroundColor: string;
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
  outlineColor: string;
  textDecorationColor: string;
  fill?: string;
  stroke?: string;
  backgroundImage?: string;
  boxShadow?: string;
}

function triggerBlobDownload(pdf: jsPDF, safeFileName: string): void {
  try {
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup errors
      }
    }, 1500);
  } catch {
    pdf.save(safeFileName);
  }
}

export async function downloadElementAsPdf(
  element: HTMLElement | null,
  fileName: string
): Promise<boolean> {
  if (!element) return false;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready.catch(() => undefined);
    }

    const resolveColor = createColorResolver();
    const sanitizedLinkedCss = collectSanitizedLinkedCss();

    // 1. Snapshot exact computed RGB/RGBA colors from the live DOM before cloning
    const originalNodes: Element[] = [element, ...Array.from(element.querySelectorAll('*'))];
    const snapshots: ColorSnapshot[] = originalNodes.map((node) => {
      const cs = window.getComputedStyle(node);
      const snap: ColorSnapshot = {
        color: resolveColor(cs.color, 'rgb(15, 23, 42)'),
        backgroundColor: resolveColor(cs.backgroundColor, 'rgba(0, 0, 0, 0)'),
        borderTopColor: resolveColor(cs.borderTopColor, 'rgba(0, 0, 0, 0)'),
        borderRightColor: resolveColor(cs.borderRightColor, 'rgba(0, 0, 0, 0)'),
        borderBottomColor: resolveColor(cs.borderBottomColor, 'rgba(0, 0, 0, 0)'),
        borderLeftColor: resolveColor(cs.borderLeftColor, 'rgba(0, 0, 0, 0)'),
        outlineColor: resolveColor(cs.outlineColor, 'rgba(0, 0, 0, 0)'),
        textDecorationColor: resolveColor(cs.textDecorationColor, 'rgb(15, 23, 42)'),
      };

      if (cs.backgroundImage && UNSUPPORTED_COLOR_RE.test(cs.backgroundImage)) {
        snap.backgroundImage = 'none';
      }
      if (cs.boxShadow && UNSUPPORTED_COLOR_RE.test(cs.boxShadow)) {
        snap.boxShadow = 'none';
      }
      if (node instanceof SVGElement) {
        if (cs.fill && cs.fill !== 'none') {
          snap.fill = resolveColor(cs.fill, 'rgb(15, 23, 42)');
        }
        if (cs.stroke && cs.stroke !== 'none') {
          snap.stroke = resolveColor(cs.stroke, 'rgba(0, 0, 0, 0)');
        }
      }
      return snap;
    });

    const markerAttr = 'data-pdf-capture-target';
    const markerVal = `pdf-${Date.now()}`;
    element.setAttribute(markerAttr, markerVal);

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 960,
        onclone: (clonedDoc) => {
          // 2a. Neutralize inline <style> sheets (Vite dev mode)
          const styleNodes = Array.from(clonedDoc.querySelectorAll('style'));
          for (const styleNode of styleNodes) {
            if (styleNode.textContent && UNSUPPORTED_COLOR_RE.test(styleNode.textContent)) {
              styleNode.textContent = sanitizeCssTextForCanvas(styleNode.textContent);
            }
          }

          // 2b. Replace bundled same-origin <link rel="stylesheet"> with sanitized <style> (production builds)
          const linkNodes = Array.from(
            clonedDoc.querySelectorAll('link[rel="stylesheet"]')
          ) as HTMLLinkElement[];
          for (const linkNode of linkNodes) {
            const href = linkNode.href;
            const replacementCss = sanitizedLinkedCss.get(href);
            if (replacementCss) {
              const inlineStyle = clonedDoc.createElement('style');
              inlineStyle.textContent = replacementCss;
              linkNode.parentNode?.insertBefore(inlineStyle, linkNode);
              linkNode.remove();
            }
          }

          // Neutralize root/body colors safely
          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.style.backgroundColor = '#ffffff';
            clonedDoc.documentElement.style.color = '#0f172a';
          }
          if (clonedDoc.body) {
            clonedDoc.body.style.backgroundColor = '#ffffff';
            clonedDoc.body.style.color = '#0f172a';
          }

          const clonedTarget = clonedDoc.querySelector(
            `[${markerAttr}="${markerVal}"]`
          ) as HTMLElement | null;
          if (!clonedTarget) return;

          // Lock crisp A4 executive document width so mobile viewports never squish tables
          clonedTarget.style.width = '820px';
          clonedTarget.style.maxWidth = '820px';
          clonedTarget.style.margin = '0';
          clonedTarget.style.boxShadow = 'none';
          clonedTarget.style.borderRadius = '0px';

          const clonedNodes: Element[] = [
            clonedTarget,
            ...Array.from(clonedTarget.querySelectorAll('*')),
          ];

          const count = Math.min(clonedNodes.length, snapshots.length);
          for (let i = 0; i < count; i += 1) {
            const cNode = clonedNodes[i];
            const snap = snapshots[i];
            if (cNode instanceof HTMLElement) {
              cNode.style.color = snap.color;
              cNode.style.backgroundColor = snap.backgroundColor;
              cNode.style.borderTopColor = snap.borderTopColor;
              cNode.style.borderRightColor = snap.borderRightColor;
              cNode.style.borderBottomColor = snap.borderBottomColor;
              cNode.style.borderLeftColor = snap.borderLeftColor;
              cNode.style.outlineColor = snap.outlineColor;
              cNode.style.textDecorationColor = snap.textDecorationColor;
              if (snap.backgroundImage) cNode.style.backgroundImage = snap.backgroundImage;
              if (snap.boxShadow) cNode.style.boxShadow = snap.boxShadow;
              if (cNode.style.overflowX === 'auto' || cNode.classList.contains('overflow-x-auto')) {
                cNode.style.overflowX = 'visible';
              }
            } else if (cNode instanceof SVGElement) {
              if (snap.fill) cNode.style.fill = snap.fill;
              if (snap.stroke) cNode.style.stroke = snap.stroke;
            }
          }
        },
      });
    } finally {
      element.removeAttribute(markerAttr);
    }

    // 3. Assemble crisp multi-page A4 PDF with executive margins & gold-ruled vector footers
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const marginX = 8;
    const marginTop = 8;
    const marginBottom = 13;
    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginTop - marginBottom;

    const pxPerMm = canvas.width / usableWidth;
    const pageSliceHeightPx = Math.floor(usableHeight * pxPerMm);
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageSliceHeightPx));

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx += 1) {
      if (pageIdx > 0) pdf.addPage();

      const sliceY = pageIdx * pageSliceHeightPx;
      const sliceHeight = Math.min(pageSliceHeightPx, canvas.height - sliceY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          sliceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const sliceDataUrl = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceHeight / pxPerMm;
      pdf.addImage(
        sliceDataUrl,
        'PNG',
        marginX,
        marginTop,
        usableWidth,
        sliceHeightMm,
        undefined,
        'FAST'
      );

      // Executive vector micro-footer with metallic champagne gold hairline
      const footerRuleY = pageHeight - 9.5;
      pdf.setDrawColor(200, 162, 82);
      pdf.setLineWidth(0.35);
      pdf.line(marginX, footerRuleY, pageWidth - marginX, footerRuleY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        'Staff. Online  •  Official Verified Digital Financial Statement',
        marginX,
        pageHeight - 5.2
      );
      pdf.text(
        `Page ${pageIdx + 1} of ${totalPages}`,
        pageWidth - marginX,
        pageHeight - 5.2,
        { align: 'right' }
      );
    }

    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const safeFileName = cleanName.toLowerCase().endsWith('.pdf')
      ? cleanName
      : `${cleanName}.pdf`;

    triggerBlobDownload(pdf, safeFileName);
    return true;
  } catch (err) {
    console.error('PDF export error:', err);
    return false;
  }
}

export function triggerDirectPrint(): void {
  try {
    window.print();
  } catch {
    // ignore
  }
}
