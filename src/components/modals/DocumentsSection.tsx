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

  const uploadFile = (file: File) => {
    if (!user) return;
    
    setUploading(true);
    setProgress(0);
    
    const docId = generateSafeId();
    const storageRef = ref(storage, `users/${user.uid}/escrows/${escrow.id}/documents/${docId}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (error) => {
        console.error("Upload failed:", error);
        setUploading(false);
        setProgress(0);
        alert("Failed to upload file. Please check your storage rules.");
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newDoc: EscrowDocument = {
            id: docId,
            name: file.name,
            url: downloadURL,
            uploadedAt: new Date().toISOString(),
            size: file.size,
            type: file.type,
          };
          const existingDocs = escrow.documents || [];
          onUpdate({ documents: [...existingDocs, newDoc] });
        } catch (err) {
           console.error("Error getting download URL", err);
        } finally {
          setUploading(false);
          setProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    uploadFile(file);
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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDelete = async (docId: string, url: string, name: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    if (user && url && url !== '#') {
      try {
        const storageRef = ref(storage, `users/${user.uid}/escrows/${escrow.id}/documents/${docId}_${name}`);
        await deleteObject(storageRef);
      } catch (err) {
        console.error("Error deleting from storage:", err);
      }
    }
    
    const existingDocs = escrow.documents || [];
    onUpdate({ documents: existingDocs.filter(d => d.id !== docId) });
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
        />
        <button
          onClick={handleUploadClick}
          disabled={uploading || !user}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
            uploading || !user
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'text-[#1B3A5C] bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 active:scale-95'
          }`}
          title={!user ? "Login required to upload" : "Upload Document"}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>{Math.round(progress)}%</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Upload File</span>
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
            ? "Release to upload document" 
            : uploading 
            ? `Uploading... ${Math.round(progress)}%` 
            : "Drag & drop PDF / docs here or click to browse"}
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
                <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Quick Preview"
                  >
                    <Eye size={14} />
                  </button>
                  <a
                    href={doc.url}
                    download={doc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-[#1B3A5C] hover:bg-slate-50 rounded-md transition-colors"
                    title="Download File"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id, doc.url, doc.name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
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
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700"
                  title="Open in new window / tab"
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
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
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
                <iframe 
                  src={previewDoc.url} 
                  title={previewDoc.name} 
                  className="w-full h-full rounded-lg border border-slate-200 bg-white shadow-sm"
                />
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
    </section>
  );
}
