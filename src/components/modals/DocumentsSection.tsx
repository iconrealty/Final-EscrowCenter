import React, { useState, useRef } from 'react';
import { Escrow, EscrowDocument, Listing, ListingDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileText, Upload, Trash2, Download, Loader2, Eye, ExternalLink, X, AlertCircle } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

interface DocumentsSectionProps {
  escrow?: Escrow;
  listing?: Listing;
  onUpdate: (data: { documents?: (EscrowDocument | ListingDocument)[] }) => void;
}

export function DocumentsSection({ escrow, listing, onUpdate }: DocumentsSectionProps) {
  const { user } = useAuth();
  const target = escrow || listing;
  const targetId = target?.id || '';

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EscrowDocument | ListingDocument | null>(null);
  const [useGoogleViewer, setUseGoogleViewer] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; url: string; name: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  const generateSafeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  };

  const handleUploadClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0 || !targetId) return;
    
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
      const p = Math.min(100, Math.round((sumTransferred / totalBytes) * 100));
      setProgress(p);
    };

    let hasError = false;

    const uploadPromises = validFiles.map((file, index) => {
      return new Promise<EscrowDocument | null>((resolve) => {
        const docId = generateSafeId();
        // Use standard escrows bucket path proven to work with existing storage permissions
        const userId = user ? user.uid : 'default_user';
        const storageRef = ref(storage, `users/${userId}/escrows/${targetId}/documents/${docId}_${file.name}`);
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
                type: file.type || 'application/octet-stream',
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
      const existingDocs = target?.documents || [];
      onUpdate({ documents: [...existingDocs, ...successfulDocs] });
    }

    if (hasError) {
      alert("One or more files failed to upload. Please check your network connection.");
    }

    setUploading(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      await uploadFiles(files);
    }
  };

  const executeDelete = async (docId: string, url: string, name: string) => {
    setDeletingId(docId);
    try {
      if (url && url !== '#' && url.startsWith('http')) {
        try {
          const storageRef = ref(storage, url);
          await deleteObject(storageRef);
        } catch {
          try {
            const userId = user ? user.uid : 'default_user';
            const pathRef = ref(storage, `users/${userId}/escrows/${targetId}/documents/${docId}_${name}`);
            await deleteObject(pathRef);
          } catch (storageErr) {
            console.warn("Storage object cleanup notice:", storageErr);
          }
        }
      }
    } catch (err) {
      console.error("Error during document deletion:", err);
    } finally {
      const existingDocs = target?.documents || [];
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

  const isImage = (doc: EscrowDocument | ListingDocument) => {
    const name = doc.name.toLowerCase();
    const type = doc.type?.toLowerCase() || '';
    return type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
  };

  const isPdf = (doc: EscrowDocument | ListingDocument) => {
    const name = doc.name.toLowerCase();
    const type = doc.type?.toLowerCase() || '';
    return type === 'application/pdf' || name.endsWith('.pdf');
  };

  const docs = target?.documents || [];

  return (
    <section 
      className="space-y-4 rounded-2xl -mx-2 transition-colors"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e5ea]">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-black">
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
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
            uploading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'text-[#1B3A5C] bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 active:scale-95'
          }`}
          title="Upload Documents"
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

      {/* Prominent Drop Area */}
      <div 
        onClick={handleUploadClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/90 ring-4 ring-blue-100 scale-[1.01]' 
            : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-[#1B3A5C]'
        } ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-2.5 pointer-events-none">
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-blue-600" />
          ) : (
            <Upload size={24} className={isDragging ? "text-blue-600 animate-bounce" : "text-[#1B3A5C]"} />
          )}
        </div>
        
        <p className="text-xs sm:text-sm font-bold text-slate-800 text-center pointer-events-none">
          {uploading 
            ? `Uploading to cloud (${Math.round(progress)}%)...` 
            : isDragging
            ? "Release files here to upload"
            : "Drag & drop multiple files here or click to browse"}
        </p>
        <p className="text-[11px] text-slate-500 mt-1 pointer-events-none">
          or <span className="text-[#1B3A5C] font-semibold underline underline-offset-2">browse files</span> from your computer
        </p>
        <p className="text-[10px] text-slate-400 mt-1 pointer-events-none">
          Supports PDF, Word, PNG, JPG (up to 25MB)
        </p>

        {uploading && (
          <div className="w-full max-w-xs mt-3.5 bg-slate-200 rounded-full h-2 overflow-hidden pointer-events-none">
            <div 
              className="bg-blue-600 h-2 transition-all duration-300 rounded-full" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      {docs.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-medium text-slate-500 px-1">Uploaded Files (click file to preview in modal)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {docs.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => setPreviewDoc(doc)}
                className="flex items-center justify-between p-3 bg-white border border-[#e5e5ea] rounded-xl shadow-xs hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1B3A5C] flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#1d1d1f] truncate group-hover:text-blue-600 transition-colors" title={doc.name}>
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[#86868b] mt-0.5">
                      <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}</span>
                      {doc.size ? <span>• {formatSize(doc.size)}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    className="p-1.5 text-slate-500 hover:text-[#1B3A5C] hover:bg-white rounded-lg transition-colors"
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
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors"
                    title="Download File"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteDoc({ id: doc.id, url: doc.url, name: doc.name });
                    }}
                    disabled={deletingId === doc.id}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                    title="Delete File"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={15} className="animate-spin text-red-500" />
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <AlertCircle size={22} />
              <h4 className="font-bold text-slate-900 text-sm">Delete Document?</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{confirmDeleteDoc.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const doc = confirmDeleteDoc;
                  setConfirmDeleteDoc(null);
                  if (doc) executeDelete(doc.id, doc.url, doc.name);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-[#1B3A5C] shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {previewDoc.name}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs font-bold text-[#1B3A5C] bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 shadow-2xs"
                >
                  <ExternalLink size={12} />
                  <span>Open New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {isImage(previewDoc) ? (
                <img 
                  src={previewDoc.url} 
                  alt={previewDoc.name} 
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : isPdf(previewDoc) ? (
                <iframe
                  src={previewDoc.url.startsWith('data:') ? previewDoc.url : (useGoogleViewer ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.url)}&embedded=true` : previewDoc.url)}
                  title={previewDoc.name}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-xs border border-slate-200 max-w-md">
                  <FileText size={48} className="text-slate-300 mx-auto mb-3" />
                  <h5 className="font-bold text-slate-800 text-sm mb-1">{previewDoc.name}</h5>
                  <p className="text-xs text-slate-500 mb-4">
                    This file format does not support direct in-browser rendering.
                  </p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B3A5C] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#11253C]"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
