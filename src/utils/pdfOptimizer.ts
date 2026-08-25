import { PDFDocument } from 'pdf-lib';

/**
 * Optimizes a PDF by extracting only the essential deal pages
 * (Page 1-4: Property, Price, Paragraph 3 grid, Contingencies; and the last 2 pages: Broker & Escrow confirmations).
 * This reduces a 16-30 page PDF down to ~4-5 pages, cutting token usage by 85%+ and avoiding timeouts.
 */
export async function optimizePdfForScanning(file: File): Promise<{
  dataUrl: string;
  isOptimized: boolean;
  pageCount?: number;
}> {
  // If not a PDF, convert file directly to Data URL
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, isOptimized: false });
      reader.onerror = () => reject(new Error('Failed to read document file.'));
      reader.readAsDataURL(file);
    });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // If already 4 or fewer pages, no need to slice
    if (totalPages <= 4) {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read PDF.'));
        reader.readAsDataURL(file);
      });
      return { dataUrl: base64Data, isOptimized: false, pageCount: totalPages };
    }

    // Determine which key pages to extract:
    // Pages 1-3 (indices 0, 1, 2) contain Property, Price, Financing, Contingency Timelines (Paragraph 3 grid)
    // Page 4 (index 3) contains additional contract terms/allocations
    // Last 2 pages (indices totalPages - 2, totalPages - 1) contain Broker Confirmations & Escrow details
    const pagesToKeep = new Set<number>();

    // Add first 3 or 4 pages
    pagesToKeep.add(0);
    pagesToKeep.add(1);
    if (totalPages > 2) pagesToKeep.add(2);
    if (totalPages > 3) pagesToKeep.add(3);

    // Add last 2 pages
    if (totalPages > 4) {
      pagesToKeep.add(totalPages - 2);
      pagesToKeep.add(totalPages - 1);
    }

    // Create a new compact PDF document
    const destDoc = await PDFDocument.create();
    const sortedIndices = Array.from(pagesToKeep).filter(idx => idx >= 0 && idx < totalPages).sort((a, b) => a - b);
    const copiedPages = await destDoc.copyPages(srcDoc, sortedIndices);
    
    for (const page of copiedPages) {
      destDoc.addPage(page);
    }

    const pdfBytes = await destDoc.save();
    
    // Convert Uint8Array to base64 data URL
    let binary = '';
    const bytes = new Uint8Array(pdfBytes);
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64String = btoa(binary);
    const dataUrl = `data:application/pdf;base64,${base64String}`;

    return {
      dataUrl,
      isOptimized: true,
      pageCount: totalPages,
    };
  } catch (err) {
    console.warn('PDF optimization error, falling back to full file:', err);
    // Fallback: Read full file as Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, isOptimized: false });
      reader.onerror = () => reject(new Error('Failed to read PDF file.'));
      reader.readAsDataURL(file);
    });
  }
}
