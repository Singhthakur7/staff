import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadElementAsPdf(
  element: HTMLElement | null,
  fileName: string
): Promise<boolean> {
  if (!element) return false;
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: Math.max(element.scrollWidth, 820),
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgHeightMm = (canvas.height * usableWidth) / canvas.width;

    if (imgHeightMm <= usableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeightMm);
    } else {
      let heightLeft = imgHeightMm;
      let yOffset = margin;
      let pageIdx = 0;

      while (heightLeft > 0) {
        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, yOffset, usableWidth, imgHeightMm);
        heightLeft -= usableHeight;
        yOffset -= usableHeight;
        pageIdx += 1;
      }
    }

    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(safeFileName);
    return true;
  } catch {
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
