import React, { useState, useRef } from 'react';
import { Escrow, EscrowDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileText, Upload, Trash2, Download, Loader2 } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export function DocumentsSection({ escrow, onUpdate }: { escrow: Escrow; onUpdate: (data: Partial<Escrow>) => void }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
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

  const docs = escrow.documents || [];

  return (
    <section 
      className={`space-y-4 rounded-2xl p-4 -mx-4 transition-colors ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-transparent border-2 border-transparent'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e5ea]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#86868b]">
          Documents
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
              : 'text-[#1B3A5C] bg-[#1B3A5C]/5 hover:bg-[#1B3A5C]/10 active:scale-95'
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
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      {!user && (
        <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-200">
          Sign in to upload and manage documents securely.
        </div>
      )}

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-white border border-dashed border-[#e5e5ea] rounded-2xl text-[#86868b]">
          <FileText size={32} className="mb-2 opacity-50" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs opacity-70 mt-1">Upload signed forms, disclosures, or RPAs here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-[#e5e5ea] rounded-xl shadow-sm hover:border-slate-300 transition-all group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[#1B3A5C]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] truncate" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-[#86868b] mt-0.5">
                    {new Date(doc.uploadedAt).toLocaleDateString()} {formatSize(doc.size) ? `• ${formatSize(doc.size)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-[#1B3A5C] hover:bg-slate-50 rounded-md transition-colors"
                  title="View / Download"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => handleDelete(doc.id, doc.url, doc.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
