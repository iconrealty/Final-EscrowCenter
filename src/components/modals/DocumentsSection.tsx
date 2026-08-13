import React, { useState, useRef } from 'react';
import { Escrow, EscrowDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileText, Upload, Trash2, Download, Loader2, Eye, ExternalLink, X } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export function DocumentsSection({ escrow, onUpdate }: { escrow: Escrow; onUpdate: (data: Partial<Escrow>) => void }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EscrowDocument | null>(null);
  const [useGoogleViewer, setUseGoogleViewer] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateSafeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFiles = async (files: File[]) => {
    if (!user || files.length === 0) return;
    
    setUploading(true);
    setProgress(0);

    const validFiles = Array.from(files);
    const totalBytes = validFiles.reduce((acc, f) => acc + f.size, 0);
    const bytesTransferredMap: Record<number, number> = {};

    const updateCombinedProgress = () => {
      if (totalBytes <= 0) {
        setProgress(100);
        return;
      }
      const sumTransferred = Object.values(bytesTransferredMap).reduce((a, b) => a + b, 0);
      const p = Math.min(100, (sumTransferred / totalBytes) * 100);
      setProgress(p);
    };

    let hasError = false;

    const uploadPromises = validFiles.map((file, index) => {
      return new Promise<EscrowDocument | null>((resolve) => {
        const docId = generateSafeId();
        const storageRef = ref(storage, `users/${user.uid}/escrows/${escrow.id}/documents/${docId}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        bytesTransferredMap[index] = 0;

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            bytesTransferredMap[index] = snapshot.bytesTransferred;
            updateCombinedProgress();
          },
          (error) => {
            console.error(`Upload failed for ${file.name}:`, error);
            hasError = true;
            resolve(null);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const doc: EscrowDocument = {
                id: docId,
                name: file.name,
                url: downloadURL,
                uploadedAt: new Date().toISOString(),
                size: file.size,
                type: file.type,
              };
              bytesTransferredMap[index] = file.size;
              updateCombinedProgress();
              resolve(doc);
            } catch (err) {
              console.error(`Error getting download URL for ${file.name}:`, err);
              resolve(null);
            }
          }
        );
      });
    });

    const results = await Promise.all(uploadPromises);
    const successfulDocs = results.filter((d): d is EscrowDocument => d !== null);

    if (successfulDocs.length > 0) {
      const existingDocs = escrow.documents || [];
      onUpdate({ documents: [...existingDocs, ...successfulDocs] });
    }

    if (hasError) {
      alert("One or more files failed to upload. Please check your storage rules or connection.");
    }

    setUploading(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !user) return;
    uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!user) return;

    const files = Array.from(e.dataTransfer.files || []) as File[];
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; url: string; name: string } | null>(null);

  const executeDelete = async (docId: string, url: string, name: string) => {
    setDeletingId(docId);

    try {
      if (user && url && url !== '#' && url.startsWith('http')) {
        try {
          const storageRef = ref(storage, url);
          await deleteObject(storageRef);
        } catch {
          try {
            const pathRef = ref(storage, `users/${user.uid}/escrows/${escrow.id}/documents/${docId}_${name}`);
            await deleteObject(pathRef);
          } catch (storageErr) {
            console.warn("Storage object cleanup notice:", storageErr);
          }
        }
      }
    } catch (err) {
      console.error("Error during document deletion:", err);
    } finally {
      const existingDocs = escrow.documents || [];
      const updatedDocs = existingDocs.filter(d => d.id !== docId);
      onUpdate({ documents: updatedDocs });

      if (previewDoc?.id === docId) {
        setPreviewDoc(null);
      }
      setDeletingId(null);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isImage = (doc: EscrowDocument) => {
    const name = doc.name.toLowerCase();
    const type = doc.type?.toLowerCase() || '';
    return type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
  };

  const isPdf = (doc: EscrowDocument) => {
    const name = doc.name.toLowerCase();
    const type = doc.type?.toLowerCase() || '';
    return type === 'application/pdf' || name.endsWith('.pdf');
  };

  const docs = escrow.documents || [];

  return (
    <section 
      className="space-y-4 rounded-2xl -mx-2 transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e5ea]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#86868b]">
          Documents ({docs.length})
        </h3>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          multiple
        />
        <button
          onClick={handleUploadClick}
          disabled={uploading || !user}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
            uploading || !user
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'text-[#1B3A5C] bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 active:scale-95'
          }`}
          title={!user ? "Login required to upload" : "Upload Documents"}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>{Math.round(progress)}%</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Upload Files</span>
            </>
          )}
        </button>
      </div>

      {!user && (
        <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-200">
          Sign in to upload and manage documents securely.
        </div>
      )}

      {/* Prominent Drop Area */}
      <div 
        onClick={() => { if (user && !uploading) handleUploadClick(); }}
        className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/90 ring-4 ring-blue-100 scale-[1.01]' 
            : 'border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-400'
        } ${!user || uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-blue-100 flex items-center justify-center mb-2">
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-blue-600" />
          ) : (
            <Upload size={20} className={isDragging ? "text-blue-600 animate-bounce" : "text-[#1B3A5C]"} />
          )}
        </div>
        <p className="text-xs font-semibold text-[#1B3A5C]">
          {isDragging 
            ? "Release to upload files" 
            : uploading 
            ? `Uploading... ${Math.round(progress)}%` 
            : "Drag & drop multiple files here or click to browse"}
        </p>
        <p className="text-[10px] text-[#86868b] mt-0.5">
          Supports PDF, Word, PNG, JPG (up to 25MB)
        </p>
      </div>

      {docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-500 px-1">Uploaded Files (click file to preview in modal)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {docs.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => setPreviewDoc(doc)}
                className="flex items-center justify-between p-3 bg-white border border-[#e5e5ea] rounded-xl shadow-sm hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100/50 transition-colors">
                    <FileText size={16} className="text-[#1B3A5C]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] group-hover:text-blue-700 truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-[#86868b] mt-0.5">
                      {new Date(doc.uploadedAt).toLocaleDateString()} {formatSize(doc.size) ? `• ${formatSize(doc.size)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Quick Preview"
                  >
                    <Eye size={15} />
                  </button>
                  <a
                    href={doc.url}
                    download={doc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-500 hover:text-[#1B3A5C] hover:bg-slate-50 rounded-md transition-colors"
                    title="Download File"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteDoc({ id: doc.id, url: doc.url, name: doc.name });
                    }}
                    disabled={deletingId === doc.id}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete Document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={15} className="animate-spin text-rose-500" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="relative w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate text-white" title={previewDoc.name}>
                    {previewDoc.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Uploaded {new Date(previewDoc.uploadedAt).toLocaleDateString()} {formatSize(previewDoc.size) ? `• ${formatSize(previewDoc.size)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isPdf(previewDoc) && (
                  <div className="hidden xs:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] mr-1">
                    <button
                      onClick={() => setUseGoogleViewer(true)}
                      className={`px-2 py-1 rounded-md transition-all ${
                        useGoogleViewer
                          ? 'bg-blue-600 text-white font-medium shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Google Viewer supports multi-page scrolling on mobile"
                    >
                      Multi-Page
                    </button>
                    <button
                      onClick={() => setUseGoogleViewer(false)}
                      className={`px-2 py-1 rounded-md transition-all ${
                        !useGoogleViewer
                          ? 'bg-blue-600 text-white font-medium shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Direct PDF file"
                    >
                      Direct
                    </button>
                  </div>
                )}
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700"
                  title="Open full document in new tab"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Open New Tab</span>
                </a>
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
                  title="Download document"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  onClick={() => setConfirmDeleteDoc({ id: previewDoc.id, url: previewDoc.url, name: previewDoc.name })}
                  disabled={deletingId === previewDoc.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/70 hover:bg-rose-900 hover:text-white border border-rose-800/80 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Delete document"
                >
                  {deletingId === previewDoc.id ? (
                    <Loader2 size={14} className="animate-spin text-rose-300" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Close preview window"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative">
              {isImage(previewDoc) ? (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <img 
                    src={previewDoc.url} 
                    alt={previewDoc.name} 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200"
                  />
                </div>
              ) : isPdf(previewDoc) ? (
                useGoogleViewer ? (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.url)}&embedded=true`} 
                    title={previewDoc.name} 
                    className="w-full h-full rounded-lg border border-slate-200 bg-white shadow-sm"
                  />
                ) : (
                  <iframe 
                    src={previewDoc.url} 
                    title={previewDoc.name} 
                    className="w-full h-full rounded-lg border border-slate-200 bg-white shadow-sm"
                  />
                )
              ) : (
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.url)}&embedded=true`} 
                  title={previewDoc.name} 
                  className="w-full h-full rounded-lg border border-slate-200 bg-white shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Document Deletion (iframe-safe) */}
      {confirmDeleteDoc && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setConfirmDeleteDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={22} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Delete Document?</h4>
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 px-1">
                Are you sure you want to delete <strong className="text-slate-800 font-semibold">{confirmDeleteDoc.name}</strong>?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                disabled={deletingId === confirmDeleteDoc.id}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = confirmDeleteDoc;
                  await executeDelete(target.id, target.url, target.name);
                  setConfirmDeleteDoc(null);
                }}
                disabled={deletingId === confirmDeleteDoc.id}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                {deletingId === confirmDeleteDoc.id ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
