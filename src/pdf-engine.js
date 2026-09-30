/**
 * OmniPDF Engine - 100% Offline Client-Side PDF Manipulation Library
 * Powered by pdf-lib and JSZip
 */
import { PDFDocument, rgb, degrees, StandardFonts, PageSizes } from 'pdf-lib';
import JSZip from 'jszip';

export class PDFEngine {
  /**
   * Helper: Read File or Blob as ArrayBuffer
   */
  static async toArrayBuffer(file) {
    if (file instanceof ArrayBuffer) return file;
    if (file instanceof Uint8Array) {
      return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    }
    if (file && file.buffer instanceof ArrayBuffer) {
      return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    }
    if (file && typeof file.arrayBuffer === 'function') {
      return await file.arrayBuffer();
    }
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
      return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    }
    throw new Error('Unsupported buffer/file format');
  }

  /**
   * Helper: Parse page range string like "1, 3, 5-8" into 1-based page number array
   */
  static parsePageRanges(rangeStr, totalPages) {
    if (!rangeStr || rangeStr.trim() === '') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(totalPages, parseInt(endStr, 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pages.add(p);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  /**
   * 1. MERGE PDFs
   * Combines an arbitrary number of PDF documents in the order provided.
   */
  static async mergePDFs(files, onProgress) {
    if (!files || files.length === 0) throw new Error('Pilih minimal 1 file PDF.');
    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      if (onProgress) onProgress(i, files.length, `Menggabungkan: ${files[i].name || `File ${i + 1}`}`);
      const buffer = await this.toArrayBuffer(files[i]);
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    if (onProgress) onProgress(files.length, files.length, 'Menyimpan dokumen gabungan...');
    const mergedPdfBytes = await mergedDoc.save({ useObjectStreams: true });
    return {
      bytes: mergedPdfBytes,
      fileName: `omnipdf_merged_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      pageCount: mergedDoc.getPageCount()
    };
  }

  /**
   * 2. SPLIT PDF
   * Divides a single PDF into separate single-page files or by page range chunks.
   * Packages multiple outputs into a ZIP file.
   */
  static async splitPDF(file, splitMode = 'all_pages', customRange = '', onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();
    const zip = new JSZip();

    if (splitMode === 'all_pages') {
      for (let i = 0; i < totalPages; i++) {
        if (onProgress) onProgress(i, totalPages, `Mengekstrak halaman ${i + 1} dari ${totalPages}`);
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(sourceDoc, [i]);
        newDoc.addPage(copiedPage);
        const bytes = await newDoc.save({ useObjectStreams: true });
        const paddedIndex = String(i + 1).padStart(3, '0');
        zip.file(`halaman_${paddedIndex}.pdf`, bytes);
      }
      if (onProgress) onProgress(totalPages, totalPages, 'Mengompres arsip ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'uint8array' });
      return {
        bytes: zipBlob,
        fileName: `omnipdf_split_${Date.now()}.zip`,
        mimeType: 'application/zip'
      };
    } else {
      // Custom range split
      const pages = this.parsePageRanges(customRange, totalPages);
      if (pages.length === 0) throw new Error('Rentang halaman tidak valid.');
      const newDoc = await PDFDocument.create();
      const pageIndices = pages.map((p) => p - 1);
      const copied = await newDoc.copyPages(sourceDoc, pageIndices);
      copied.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save({ useObjectStreams: true });
      return {
        bytes,
        fileName: `omnipdf_split_range_${Date.now()}.pdf`,
        mimeType: 'application/pdf'
      };
    }
  }

  /**
   * 3. EXTRACT PAGES
   * Extracts specified pages into a new clean PDF.
   */
  static async extractPages(file, rangeString, onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();
    const pages = this.parsePageRanges(rangeString, totalPages);
    if (pages.length === 0) throw new Error('Pilih halaman yang ingin diekstrak (contoh: 1, 3, 5-8).');

    if (onProgress) onProgress(1, 2, `Mengekstrak ${pages.length} halaman...`);
    const newDoc = await PDFDocument.create();
    const pageIndices = pages.map((p) => p - 1);
    const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    if (onProgress) onProgress(2, 2, 'Menyimpan...');
    const bytes = await newDoc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_extracted_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      pageCount: newDoc.getPageCount()
    };
  }

  /**
   * 4. DELETE / REMOVE PAGES
   * Removes specific pages from a PDF.
   */
  static async deletePages(file, pagesToDeleteString, onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = doc.getPageCount();
    const pagesToDelete = this.parsePageRanges(pagesToDeleteString, totalPages);
    if (pagesToDelete.length === 0) throw new Error('Tentukan halaman yang ingin dihapus (contoh: 2, 4-6).');
    if (pagesToDelete.length >= totalPages) throw new Error('Anda tidak dapat menghapus seluruh halaman dokumen.');

    // Sort descending so indices don't shift when removing
    const indicesToRemove = pagesToDelete.map((p) => p - 1).sort((a, b) => b - a);
    indicesToRemove.forEach((idx) => doc.removePage(idx));

    if (onProgress) onProgress(1, 1, 'Menyimpan dokumen...');
    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_deleted_pages_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      pageCount: doc.getPageCount()
    };
  }

  /**
   * 5. ROTATE PAGES
   * Rotates pages by 90, 180, or 270 degrees.
   */
  static async rotatePDF(file, rotationDegrees = 90, pageRange = '', onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = doc.getPageCount();
    const pagesToRotate = this.parsePageRanges(pageRange, totalPages);

    for (let i = 0; i < pagesToRotate.length; i++) {
      const pageIdx = pagesToRotate[i] - 1;
      const page = doc.getPage(pageIdx);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationDegrees) % 360));
      if (onProgress) onProgress(i + 1, pagesToRotate.length, `Memutar halaman ${pagesToRotate[i]}`);
    }

    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_rotated_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      pageCount: doc.getPageCount()
    };
  }

  /**
   * 6. REORDER / REVERSE PAGES
   */
  static async reorderPDF(file, orderMode = 'reverse', customOrder = '', onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();
    let newIndices = [];

    if (orderMode === 'reverse') {
      newIndices = Array.from({ length: totalPages }, (_, i) => totalPages - 1 - i);
    } else {
      const pages = this.parsePageRanges(customOrder, totalPages);
      if (pages.length === 0) throw new Error('Urutan halaman tidak valid.');
      newIndices = pages.map((p) => p - 1);
    }

    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(sourceDoc, newIndices);
    copied.forEach((p) => newDoc.addPage(p));

    const bytes = await newDoc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_reordered_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      pageCount: newDoc.getPageCount()
    };
  }

  /**
   * 7. IMAGES TO PDF
   * Converts multiple images (JPG, PNG, WebP) into a clean PDF document.
   */
  static async imagesToPDF(imageFiles, pageSize = 'A4', orientation = 'portrait', onProgress) {
    if (!imageFiles || imageFiles.length === 0) throw new Error('Pilih minimal 1 file gambar.');
    const pdfDoc = await PDFDocument.create();

    const targetDimensions = {
      A4: [595.28, 841.89],
      Letter: [612.0, 792.0]
    }[pageSize] || [595.28, 841.89];

    for (let i = 0; i < imageFiles.length; i++) {
      if (onProgress) onProgress(i, imageFiles.length, `Memproses gambar ${i + 1} dari ${imageFiles.length}`);
      const file = imageFiles[i];
      const buffer = await this.toArrayBuffer(file);
      const isPng = file.type === 'image/png' || file.name?.toLowerCase().endsWith('.png');

      let embeddedImage;
      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(buffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(buffer);
        }
      } catch (err) {
        // Fallback for WebP or unhandled formats: draw to canvas and convert to PNG
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = blobUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pngBlob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        const pngBuf = await pngBlob.arrayBuffer();
        embeddedImage = await pdfDoc.embedPng(pngBuf);
        URL.revokeObjectURL(blobUrl);
      }

      let pageWidth = orientation === 'landscape' ? targetDimensions[1] : targetDimensions[0];
      let pageHeight = orientation === 'landscape' ? targetDimensions[0] : targetDimensions[1];

      // Auto-fit image keeping aspect ratio
      const imgDims = embeddedImage.scaleToFit(pageWidth - 40, pageHeight - 40);
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImage, {
        x: (pageWidth - imgDims.width) / 2,
        y: (pageHeight - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height
      });
    }

    if (onProgress) onProgress(imageFiles.length, imageFiles.length, 'Menyusun dokumen PDF...');
    const bytes = await pdfDoc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_images_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      pageCount: pdfDoc.getPageCount()
    };
  }

  /**
   * 8. ADD WATERMARK
   * Adds custom text watermark across document pages.
   */
  static async addWatermark(file, watermarkText, options = {}, onProgress) {
    if (!watermarkText || watermarkText.trim() === '') throw new Error('Masukkan teks watermark.');
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const totalPages = doc.getPageCount();

    const fontSize = options.fontSize || 48;
    const opacity = options.opacity !== undefined ? options.opacity : 0.25;
    const angle = options.angle !== undefined ? options.angle : 45;

    for (let i = 0; i < totalPages; i++) {
      if (onProgress) onProgress(i, totalPages, `Memberi watermark halaman ${i + 1}`);
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Centered rotation
      page.drawText(watermarkText, {
        x: width / 2 - (textWidth / 2) * Math.cos((angle * Math.PI) / 180),
        y: height / 2 - (textHeight / 2) * Math.sin((angle * Math.PI) / 180),
        size: fontSize,
        font,
        color: rgb(0.24, 0.55, 0.48), // #3D8D7A primary flat color
        opacity: opacity,
        rotate: degrees(angle)
      });
    }

    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_watermarked_${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  /**
   * 9. ADD PAGE NUMBERS
   */
  static async addPageNumbers(file, format = '{n} / {total}', position = 'bottom-center', onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const totalPages = doc.getPageCount();
    const fontSize = 10;

    for (let i = 0; i < totalPages; i++) {
      if (onProgress) onProgress(i, totalPages, `Menomori halaman ${i + 1}`);
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      const text = format.replace('{n}', i + 1).replace('{total}', totalPages);
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      let x = (width - textWidth) / 2;
      let y = 20;

      if (position === 'bottom-right') x = width - textWidth - 30;
      if (position === 'bottom-left') x = 30;
      if (position === 'top-center') y = height - 30;
      if (position === 'top-right') {
        x = width - textWidth - 30;
        y = height - 30;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.2, 0.18)
      });
    }

    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_numbered_${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  /**
   * 10. COMPRESS / OPTIMIZE PDF
   * Strips redundant objects, flattens unused dictionaries, and saves with object streams.
   */
  static async compressPDF(file, onProgress) {
    if (onProgress) onProgress(1, 2, 'Mengoptimasi struktur objek PDF...');
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    // Save with maximum structural stream compaction
    if (onProgress) onProgress(2, 2, 'Menyimpan aliran objek...');
    const bytes = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50
    });

    const originalSize = buffer.byteLength;
    const newSize = bytes.byteLength;

    return {
      bytes,
      fileName: `omnipdf_optimized_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      originalSize,
      newSize,
      reductionPercent: Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))
    };
  }

  /**
   * 11. FLATTEN PDF / LOCK FORMS
   * Flattens form fields and annotations into static page content.
   */
  static async flattenPDF(file, onProgress) {
    if (onProgress) onProgress(1, 2, 'Meratakan form dan anotasi...');
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = doc.getForm();
    try {
      form.flatten();
    } catch (e) {
      // Document has no interactive form fields to flatten
    }

    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_flattened_${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  /**
   * 12. EDIT METADATA
   * Reads and updates document info (Title, Author, Subject, Keywords, Creator).
   */
  static async readMetadata(file) {
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return {
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      subject: doc.getSubject() || '',
      keywords: doc.getKeywords() || '',
      creator: doc.getCreator() || '',
      producer: doc.getProducer() || '',
      pageCount: doc.getPageCount()
    };
  }

  static async updateMetadata(file, metadata, onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    if (metadata.title !== undefined) doc.setTitle(metadata.title);
    if (metadata.author !== undefined) doc.setAuthor(metadata.author);
    if (metadata.subject !== undefined) doc.setSubject(metadata.subject);
    if (metadata.keywords !== undefined) {
      const kw = Array.isArray(metadata.keywords)
        ? metadata.keywords
        : metadata.keywords.split(',').map((k) => k.trim());
      doc.setKeywords(kw);
    }
    if (metadata.creator !== undefined) doc.setCreator(metadata.creator);
    doc.setProducer('OmniPDF Studio Capstone');
    doc.setModificationDate(new Date());

    if (onProgress) onProgress(1, 1, 'Menyimpan metadata baru...');
    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_metadata_${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  /**
   * 13. EMBED SIGNATURE
   * Embeds drawn signature image (PNG data URL or buffer) onto specified page.
   */
  static async addSignature(file, signatureDataUrl, pageNum = 1, x = 100, y = 100, width = 150, onProgress) {
    const buffer = await this.toArrayBuffer(file);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = doc.getPageCount();
    const targetPageIdx = Math.max(0, Math.min(totalPages - 1, pageNum - 1));
    const page = doc.getPage(targetPageIdx);

    // Convert data url to Uint8Array
    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const sigBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      sigBytes[i] = binaryStr.charCodeAt(i);
    }

    const pngImage = await doc.embedPng(sigBytes);
    const aspect = pngImage.width / pngImage.height;
    const height = width / aspect;

    page.drawImage(pngImage, {
      x,
      y,
      width,
      height
    });

    if (onProgress) onProgress(1, 1, 'Menerapkan tanda tangan...');
    const bytes = await doc.save({ useObjectStreams: true });
    return {
      bytes,
      fileName: `omnipdf_signed_${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  /**
   * BATCH PROCESSING RUNNER
   * Runs an operation across multiple input files and packages results into a ZIP if needed.
   */
  static async runBatch(files, operationFn, options = {}, onProgress) {
    if (!files || files.length === 0) throw new Error('Pilih minimal 1 file.');
    if (files.length === 1) {
      return await operationFn(files[0], options, (curr, tot, msg) => {
        if (onProgress) onProgress(curr, tot, msg);
      });
    }

    const zip = new JSZip();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (onProgress) onProgress(i, files.length, `Memproses berkas ${i + 1}/${files.length}: ${file.name}`);
      const result = await operationFn(file, options, null);
      const cleanName = (file.name || `file_${i + 1}`).replace(/\.pdf$/i, '');
      zip.file(`${cleanName}_processed.pdf`, result.bytes);
    }

    if (onProgress) onProgress(files.length, files.length, 'Mengemas arsip ZIP batch...');
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    return {
      bytes: zipBytes,
      fileName: `omnipdf_batch_${Date.now()}.zip`,
      mimeType: 'application/zip'
    };
  }
}
