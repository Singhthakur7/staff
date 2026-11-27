const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxeuzdwkz';

const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'Selfie verification';

export interface CloudinaryUploadResult {
  url: string;
  storedInCloudinary: boolean;
}

/**
 * Uploads a base64 Data URL or File directly to Cloudinary using the unsigned upload preset.
 * Falls back gracefully to the original data URL if offline or unreachable.
 */
export async function uploadToCloudinary(
  imageDataUrlOrFile: string | File
): Promise<CloudinaryUploadResult> {
  const fallbackUrl = typeof imageDataUrlOrFile === 'string' ? imageDataUrlOrFile : '';

  if (
    typeof imageDataUrlOrFile === 'string' &&
    imageDataUrlOrFile.startsWith('https://res.cloudinary.com/')
  ) {
    return { url: imageDataUrlOrFile, storedInCloudinary: true };
  }

  try {
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      CLOUDINARY_CLOUD_NAME.trim()
    )}/image/upload`;

    const formData = new FormData();
    formData.append('file', imageDataUrlOrFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return { url: fallbackUrl, storedInCloudinary: false };
    }

    const data = (await response.json()) as { secure_url?: string; url?: string };
    const hostedUrl = data.secure_url || data.url;
    if (hostedUrl) {
      return { url: hostedUrl, storedInCloudinary: true };
    }

    return { url: fallbackUrl, storedInCloudinary: false };
  } catch {
    return { url: fallbackUrl, storedInCloudinary: false };
  }
}
