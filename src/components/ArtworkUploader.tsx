import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileText, Trash2, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { fetchAuthorizedArtworkBlobUrl, uploadArtworkWithProgress } from '../lib/api';
import { validateArtworkFile } from '../lib/pricing';
import type { ArtworkAttachment } from '../types/print';

interface ArtworkUploaderProps {
  artwork: ArtworkAttachment | null;
  onChange: (artwork: ArtworkAttachment | null) => void;
  required?: boolean;
  label?: string;
}

export default function ArtworkUploader({
  artwork,
  onChange,
  required = false,
  label = 'Upload Print-Ready Artwork',
}: ArtworkUploaderProps) {
  const { user, settings, configStatus, getFreshToken, openAuthModal } = useStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSizeMb = configStatus?.maxArtworkSizeMb || settings.maxArtworkSizeMb || 25;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!user) {
      setError('Please sign in first so your print artwork is saved privately to your account.');
      openAuthModal('login');
      return;
    }

    const check = validateArtworkFile(file.name, file.type, file.size, maxSizeMb);
    if (!check.valid) {
      setError(check.error);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress(5);
    try {
      const token = await getFreshToken();
      if (!token) {
        throw new Error('Authentication session expired. Please sign in again.');
      }
      const uploaded = await uploadArtworkWithProgress(file, token, setProgress);
      onChange(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artwork upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handlePreviewPrivate = async () => {
    if (!artwork) return;
    setError(null);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Sign in required to view private artwork.');
      const url = await fetchAuthorizedArtworkBlobUrl(artwork.artworkId, token);
      const win = document.createElement('a');
      win.href = url;
      win.download = artwork.fileName;
      win.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retrieve private file.');
    }
  };

  return (
    <div className="rounded-xl border border-[#DCE4DB] bg-[#F2F5F1]/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#2B1D14]">
          {label} {required && <span className="text-red-600">*</span>}
        </span>
        <span className="text-xs text-[#52635A]">PDF, PNG, JPEG · Max {maxSizeMb} MB</span>
      </div>

      {!artwork ? (
        <div>
          <input
            ref={inputRef}
            id="artwork-file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => void handleFileSelected(e)}
            className="sr-only"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              if (!user) {
                openAuthModal('login');
                return;
              }
              inputRef.current?.click();
            }}
            className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-[#B7C5B8] bg-white hover:border-[#F59E0B] hover:bg-amber-50/30 transition-colors flex flex-col items-center justify-center gap-2 text-center disabled:opacity-60"
          >
            <Upload className="w-6 h-6 text-[#3D5A4C]" aria-hidden="true" />
            <span className="text-sm font-semibold text-[#2B1D14]">
              {user ? 'Select PDF, PNG, or JPEG Artwork' : 'Sign In to Upload Private Artwork'}
            </span>
            <span className="text-xs text-[#52635A]">
              Stored privately in your account · Verified at checkout
            </span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#84A98C] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#E6ECE5] text-[#3D5A4C] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#3D5A4C] shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#2B1D14] truncate">
                  {artwork.fileName}
                </span>
              </div>
              <p className="text-xs text-[#52635A] tabular-nums">
                {(artwork.sizeBytes / 1024 / 1024).toFixed(2)} MB · Attached &amp; Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handlePreviewPrivate()}
              aria-label={`Download attached artwork ${artwork.fileName}`}
              className="px-2.5 py-1.5 rounded-lg border border-[#CFDACE] text-xs font-medium text-[#2B1D14] hover:bg-[#F2F5F1] inline-flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Verify</span>
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Remove artwork ${artwork.fileName}`}
              className="p-1.5 rounded-lg border border-[#CFDACE] text-[#52635A] hover:text-red-600 hover:border-red-200"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-[#2B1D14] tabular-nums">
            <span>Uploading artwork securely...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#DCE4DB] overflow-hidden">
            <div
              className="h-full bg-[#F59E0B] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
