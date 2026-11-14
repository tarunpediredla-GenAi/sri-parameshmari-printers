import type { ArtworkAttachment } from '../types/print';

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  idToken?: string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    if (typeof data === 'object' && data && 'code' in data) {
      err.code = String((data as { code: unknown }).code);
    }
    throw err;
  }

  return data as T;
}

export function uploadArtworkWithProgress(
  file: File,
  idToken: string,
  onProgress: (percent: number) => void
): Promise<ArtworkAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/artwork/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(parsed as ArtworkAttachment);
        } else {
          reject(new Error(parsed.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading artwork. Please try again.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

export async function fetchAuthorizedArtworkBlobUrl(
  artworkId: string,
  idToken: string
): Promise<string> {
  const res = await fetch(`/api/artwork/${encodeURIComponent(artworkId)}/file`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    let msg = 'Unable to load private artwork.';
    try {
      const json = await res.json();
      if (json?.error) msg = String(json.error);
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
