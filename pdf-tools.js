/* Core PDF Processing Functions - OmniPDF Studio */

// 1. Centralized Constants & Configurations
const PDF_CONSTANTS = {
  WORKER_SRC: 'assets/libs/pdf.worker.min.js',
  PAGE_DIMENSIONS: {
    a4: [595.28, 841.89],
    letter: [612.0, 792.0],
    legal: [612.0, 1008.0],
    a3: [841.89, 1190.55],
    a5: [419.53, 595.28]
  },
  DEFAULT_PAGE_SIZE: 'a4',
  DEFAULT_FONT_SIZE: 11,
  DEFAULT_LINE_HEIGHT: 16,
  DEFAULT_MARGIN: 50,
  RGB_MAX: 255
};

// Ensure pdf.js worker is configured
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONSTANTS.WORKER_SRC;
}

// 2. Shared Utilities & Helpers
function getBaseName(file, fallback = 'document') {
  if (!file || !file.name) return fallback;
  return file.name.replace(/\.[^/.]+$/, "");
}

function hexToPdfRgb(hexColor, fallback = { r: 0, g: 0, b: 0 }) {
  if (!hexColor || typeof hexColor !== 'string') return fallback;
  const cleanHex = hexColor.replace(/^#/, '');
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / PDF_CONSTANTS.RGB_MAX;
    const g = parseInt(cleanHex.substring(2, 4), 16) / PDF_CONSTANTS.RGB_MAX;
    const b = parseInt(cleanHex.substring(4, 6), 16) / PDF_CONSTANTS.RGB_MAX;
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  return fallback;
}

function getPageDimensions(sizeKey, fallback = PDF_CONSTANTS.DEFAULT_PAGE_SIZE) {
  const key = (sizeKey || fallback).toLowerCase();
  return PDF_CONSTANTS.PAGE_DIMENSIONS[key] || PDF_CONSTANTS.PAGE_DIMENSIONS[fallback] || PDF_CONSTANTS.PAGE_DIMENSIONS.a4;
}

async function loadPdfDocument(file) {
  const { PDFDocument } = window.PDFLib;
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
}

/**
 * Merge multiple PDF files into one
 * @param {File[]} filesList 
 * @returns {Promise<Uint8Array>}
 */
async function mergePdfs(filesList) {
  const { PDFDocument } = window.PDFLib;
  const mergedPdf = await PDFDocument.create();
  
  for (const file of filesList) {
    const pdf = await loadPdfDocument(file);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save({ useObjectStreams: true });
}

/**
 * Split a PDF file into individual pages or ranges
 * @param {File} file 
 * @param {string} mode ('individual' | 'range')
 * @param {string} rangesText (e.g. '1-3, 5')
 * @returns {Promise<Array<{filename: string, bytes: Uint8Array}>>}
 */
async function splitPdf(file, mode, rangesText) {
  const { PDFDocument } = window.PDFLib;
  const pdf = await loadPdfDocument(file);
  const baseName = getBaseName(file);
  
  if (mode === 'individual') {
    const numPages = pdf.getPageCount();
    const outputs = [];
    
    for (let i = 0; i < numPages; i++) {
      const singlePdf = await PDFDocument.create();
      const [copiedPage] = await singlePdf.copyPages(pdf, [i]);
      singlePdf.addPage(copiedPage);
      const bytes = await singlePdf.save({ useObjectStreams: true });
      outputs.push({
        filename: `${baseName}_page_${i + 1}.pdf`,
        bytes
      });
    }
    return outputs;
  } else {
    // Range mode
    const numPages = pdf.getPageCount();
    const splitPdfDoc = await PDFDocument.create();
    
    const pagesToExtract = parseRanges(rangesText, numPages);
    if (pagesToExtract.length === 0) {
      throw new Error("Invalid page ranges specified.");
    }
    
    const copiedPages = await splitPdfDoc.copyPages(pdf, pagesToExtract);
    copiedPages.forEach(page => splitPdfDoc.addPage(page));
    
    const bytes = await splitPdfDoc.save({ useObjectStreams: true });
    return [{
      filename: `${baseName}_split.pdf`,
      bytes
    }];
  }
}

function parseRanges(rangesText, maxPages) {
  const pages = [];
  const parts = rangesText.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let i = min; i <= max; i++) {
          if (i >= 1 && i <= maxPages) {
            pages.push(i - 1);
          }
        }
      }
    } else {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val) && val >= 1 && val <= maxPages) {
        pages.push(val - 1);
      }
    }
  }
  
  return [...new Set(pages)].sort((a, b) => a - b);
}

/**
 * Reorders, rotates, or deletes pages visually
 * @param {File} file 
 * @param {Array<{originalIndex: number, rotation: number}>} pagesState 
 * @returns {Promise<Uint8Array>}
 */
async function organizePdf(file, pagesState) {
  const { PDFDocument, degrees } = window.PDFLib;
  const pdf = await loadPdfDocument(file);
  const newPdf = await PDFDocument.create();
  
  for (const pageInfo of pagesState) {
    const [copiedPage] = await newPdf.copyPages(pdf, [pageInfo.originalIndex]);
    if (pageInfo.rotation) {
      const currentRotation = copiedPage.getRotation().angle || 0;
      copiedPage.setRotation(degrees((currentRotation + pageInfo.rotation) % 360));
    }
    newPdf.addPage(copiedPage);
  }
  
  return await newPdf.save({ useObjectStreams: true });
}

/**
 * Compress PDF by either optimizing structure or downsampling pages
 * @param {File} file 
 * @param {string} level ('low' | 'medium' | 'high')
 * @param {function} progressCallback 
 * @returns {Promise<Uint8Array>}
 */
async function compressPdf(file, level, progressCallback) {
  const { PDFDocument } = window.PDFLib;
  const arrayBuffer = await file.arrayBuffer();
  
  if (level === 'low') {
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return await pdf.save({ useObjectStreams: true, useFlateCompress: true });
  }
  
  const pdfjsLib = window.pdfjsLib;
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const compressedPdf = await PDFDocument.create();
  
  let scale = 1.0;
  let quality = 0.7;
  if (level === 'medium') {
    scale = 1.1;
    quality = 0.6;
  } else if (level === 'high') {
    scale = 0.75;
    quality = 0.45;
  }
  
  try {
    for (let i = 1; i <= numPages; i++) {
      if (progressCallback) progressCallback(i, numPages);
      
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      // Use toBlob directly to avoid CPU and memory spikes of base64 encoding
      const imgBytes = await new Promise(resolve => {
        canvas.toBlob(async blob => {
          if (blob) {
            resolve(await blob.arrayBuffer());
          } else {
            const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
            const response = await fetch(imgDataUrl);
            resolve(await response.arrayBuffer());
          }
        }, 'image/jpeg', quality);
      });

      // Explicitly dispose canvas buffer and page font caches immediately
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      
      const embeddedImg = await compressedPdf.embedJpg(imgBytes);
      const newPage = compressedPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }
    
    return await compressedPdf.save({ useObjectStreams: true });
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
}

/**
 * OCR a PDF to text file output
 * @param {File} file 
 * @param {string} lang 
 * @param {function} progressCallback 
 * @returns {Promise<string>}
 */
async function ocrPdf(file, lang, progressCallback) {
  const pdfjsLib = window.pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  let fullText = "";
  
  try {
    for (let i = 1; i <= numPages; i++) {
      if (progressCallback) progressCallback(i, numPages, 'extracting');
      
      const page = await pdfDoc.getPage(i);
      
      // 1. Digital text check
      let pageText = '';
      try {
        const textContent = await page.getTextContent();
        if (textContent.items && textContent.items.length > 0) {
          pageText = textContent.items.map(item => item.str).join(' ');
        }
      } catch { }
      
      // 2. If scanned or sparse, run OCR via Tesseract
      if (!pageText || pageText.trim().length < 10) {
        if (progressCallback) progressCallback(i, numPages, 'recognizing');
        try {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
            const result = await window.Tesseract.recognize(canvas, lang);
            pageText = result.data.text || '';
          }
          canvas.width = 0;
          canvas.height = 0;
        } catch (err) {
          console.warn(`OCR recognition error on page ${i}:`, err);
        }
      }
      
      fullText += `--- Page ${i} ---\n\n${pageText.trim()}\n\n`;
      page.cleanup();
    }
    
    return fullText;
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
}

/**
 * Perform OCR on a PDF and embed recognized text as an invisible searchable text layer
 * @param {File} file 
 * @param {string} lang 
 * @param {function} progressCallback 
 * @returns {Promise<Uint8Array>}
 */
async function ocrPdfToSearchablePdf(file, lang, progressCallback) {
  const arrayBuffer = await file.arrayBuffer();
  
  // 1. Get OCR text per page using pdf.js and Tesseract
  const pdfjsLib = window.pdfjsLib;
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const pageTexts = [];
  
  try {
    for (let i = 1; i <= numPages; i++) {
      if (progressCallback) progressCallback(i, numPages, 'extracting');
      const page = await pdfDoc.getPage(i);
      
      let pageText = '';
      try {
        const textContent = await page.getTextContent();
        if (textContent.items && textContent.items.length > 0) {
          pageText = textContent.items.map(item => item.str).join(' ');
        }
      } catch { }
      
      if (!pageText || pageText.trim().length < 10) {
        if (progressCallback) progressCallback(i, numPages, 'recognizing');
        try {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
            const res = await window.Tesseract.recognize(canvas, lang);
            pageText = res.data.text || '';
          }
          canvas.width = 0;
          canvas.height = 0;
        } catch (err) {
          console.warn(`OCR recognizing error on page ${i}:`, err);
        }
      }
      
      page.cleanup();
      pageTexts.push(pageText);
    }
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
  
  // 2. Load into pdf-lib to embed the searchable text layer
  const PDFLib = window.PDFLib;
  const targetPdf = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const helveticaFont = await targetPdf.embedFont(PDFLib.StandardFonts.Helvetica);
  const pages = targetPdf.getPages();
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const text = pageTexts[i] || '';
    if (!text.trim()) continue;
    
    const { width, height } = page.getSize();
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const lineHeight = 12;
    const fontSize = 9;
    let y = height - 20;
    
    for (const line of lines) {
      if (y < 20) break;
      const cleanLine = line.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').substring(0, 120);
      if (cleanLine.trim()) {
        try {
          page.drawText(cleanLine, {
            x: 20,
            y: y,
            size: fontSize,
            font: helveticaFont,
            color: PDFLib.rgb(0, 0, 0),
            opacity: 0.001
          });
        } catch { }
      }
      y -= lineHeight;
    }
  }
  
  return await targetPdf.save();
}

/**
 * Convert images to PDF
 * @param {File[]} files 
 * @param {string} orientation 
 * @param {string} margin 
 * @returns {Promise<Uint8Array>}
 */
async function jpgToPdf(files, orientation, margin) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();
  
  const marginSize = margin === 'none' ? 0 : margin === 'small' ? 20 : 50;
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    
    if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else {
      image = await pdfDoc.embedJpg(arrayBuffer);
    }
    
    const { width: imgWidth, height: imgHeight } = image.scale(1);
    
    let pageWidth = imgWidth + marginSize * 2;
    let pageHeight = imgHeight + marginSize * 2;
    
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    page.drawImage(image, {
      x: marginSize,
      y: marginSize,
      width: imgWidth,
      height: imgHeight,
    });
  }
  
  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Render PDF pages to JPG image dataURLs
 * @param {File} file 
 * @param {string} scale 
 * @param {function} progressCallback 
 * @returns {Promise<Array<{name: string, dataUrl: string}>>}
 */
async function pdfToJpg(file, scale, progressCallback) {
  const pdfjsLib = window.pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const images = [];
  
  try {
    for (let i = 1; i <= numPages; i++) {
      if (progressCallback) progressCallback(i, numPages);
      
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: parseFloat(scale) });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      images.push({
        name: `${getBaseName(file)}_page_${i}.jpg`,
        dataUrl
      });

      // Free canvas bitmap and page font caches immediately
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
    
    return images;
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
}

/**
 * Extract text from PDF document
 * @param {File} file 
 * @param {boolean} includePageNum 
 * @param {function} progressCallback 
 * @returns {Promise<string>}
 */
async function pdfToText(file, includePageNum, progressCallback) {
  const pdfjsLib = window.pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  let extractedText = "";
  
  try {
    for (let i = 1; i <= numPages; i++) {
      if (progressCallback) progressCallback(i, numPages);
      
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      let pageText = "";
      let lastY = -1;
      
      for (const item of textContent.items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += "\n";
        }
        pageText += item.str + " ";
        lastY = item.transform[5];
      }
      
      if (includePageNum) {
        extractedText += `--- Page ${i} ---\n${pageText}\n\n`;
      } else {
        extractedText += pageText + "\n\n";
      }

      page.cleanup();
    }
    
    return extractedText;
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
}

/**
 * Generate PDF from custom HTML/markdown text
 * @param {string} text 
 * @param {string} pageSize 
 * @returns {Promise<Uint8Array>}
 */
async function htmlToPdf(text, pageSize) {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();
  
  const dims = getPageDimensions(pageSize);
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage(dims);
  const margin = PDF_CONSTANTS.DEFAULT_MARGIN;
  const width = dims[0] - margin * 2;
  
  let currentY = dims[1] - margin;
  const fontSize = PDF_CONSTANTS.DEFAULT_FONT_SIZE;
  const lineHeight = PDF_CONSTANTS.DEFAULT_LINE_HEIGHT;
  
  const lines = text.split('\n');
  
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (line === '') {
      currentY -= lineHeight;
      continue;
    }
    
    let isHeading = false;
    let headingLevel = 0;
    
    if (line.startsWith('<h1>') || line.startsWith('# ')) {
      isHeading = true;
      headingLevel = 1;
      line = line.replace('<h1>', '').replace('</h1>', '').replace('# ', '');
    } else if (line.startsWith('<h2>') || line.startsWith('## ')) {
      isHeading = true;
      headingLevel = 2;
      line = line.replace('<h2>', '').replace('</h2>', '').replace('## ', '');
    } else if (line.startsWith('<h3>') || line.startsWith('### ')) {
      isHeading = true;
      headingLevel = 3;
      line = line.replace('<h3>', '').replace('</h3>', '').replace('### ', '');
    }
    
    line = line.replace(/<\/?[^>]+(>|$)/g, "");
    
    const size = isHeading ? (headingLevel === 1 ? 20 : headingLevel === 2 ? 16 : 14) : fontSize;
    const activeFont = isHeading ? boldFont : font;
    const currentLineHeight = isHeading ? size + 8 : lineHeight;
    
    const words = line.split(' ');
    let currentLineText = '';
    
    for (const word of words) {
      const testLine = currentLineText + (currentLineText === '' ? '' : ' ') + word;
      const testWidth = activeFont.widthOfTextAtSize(testLine, size);
      
      if (testWidth > width) {
        if (currentY - currentLineHeight < margin) {
          page = pdfDoc.addPage(dims);
          currentY = dims[1] - margin;
        }
        page.drawText(currentLineText, {
          x: margin,
          y: currentY,
          size: size,
          font: activeFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= currentLineHeight;
        currentLineText = word;
      } else {
        currentLineText = testLine;
      }
    }
    
    if (currentLineText !== '') {
      if (currentY - currentLineHeight < margin) {
        page = pdfDoc.addPage(dims);
        currentY = dims[1] - margin;
      }
      page.drawText(currentLineText, {
        x: margin,
        y: currentY,
        size: size,
        font: activeFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= currentLineHeight;
    }
  }
  
  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Overlay watermarks on PDF pages
 * @param {File} file 
 * @param {string} text 
 * @param {string} colorHex 
 * @param {string} opacity 
 * @param {string} rotationDeg 
 * @param {string} layout 
 * @returns {Promise<Uint8Array>}
 */
async function addWatermark(file, text, colorHex, opacity, rotationDeg, layout) {
  const { StandardFonts, rgb, degrees } = window.PDFLib;
  const pdfDoc = await loadPdfDocument(file);
  
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { r, g, b } = hexToPdfRgb(colorHex, { r: 0.8, g: 0, b: 0 });
  const color = rgb(r, g, b);
  
  const pages = pdfDoc.getPages();
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    if (layout === 'center') {
      const size = 50;
      const textWidth = font.widthOfTextAtSize(text, size);
      const textHeight = font.heightAtSize(size);
      
      page.drawText(text, {
        x: (width - textWidth) / 2 + 20,
        y: (height - textHeight) / 2,
        size: size,
        font: font,
        color: color,
        opacity: parseFloat(opacity),
        rotate: degrees(parseFloat(rotationDeg)),
      });
    } else if (layout === 'diagonal') {
      const size = 24;
      const cols = 3;
      const rows = 4;
      
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          page.drawText(text, {
            x: (width / cols) * c + 20,
            y: (height / rows) * r + 40,
            size: size,
            font: font,
            color: color,
            opacity: parseFloat(opacity),
            rotate: degrees(parseFloat(rotationDeg)),
          });
        }
      }
    } else if (layout === 'bottom-right') {
      const size = 18;
      const textWidth = font.widthOfTextAtSize(text, size);
      
      page.drawText(text, {
        x: width - textWidth - 30,
        y: 30,
        size: size,
        font: font,
        color: color,
        opacity: parseFloat(opacity),
      });
    }
  }
  
  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Overlay page numbers on PDF pages
 * @param {File} file 
 * @param {string} format 
 * @param {string} position 
 * @param {string} startPage 
 * @param {string} fontSize 
 * @returns {Promise<Uint8Array>}
 */
async function addPageNumbers(file, format, position, startPage, fontSize) {
  const { StandardFonts, rgb } = window.PDFLib;
  const pdfDoc = await loadPdfDocument(file);
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  const size = parseInt(fontSize, 10);
  const start = parseInt(startPage, 10) - 1;
  
  for (let i = start; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    
    let numText = "";
    if (format === 'simple') {
      numText = `Page ${i + 1}`;
    } else if (format === 'detailed') {
      numText = `Page ${i + 1} of ${totalPages}`;
    } else if (format === 'dash') {
      numText = `- ${i + 1} -`;
    }
    
    const textWidth = font.widthOfTextAtSize(numText, size);
    
    let x, y;
    if (position.startsWith('bottom')) {
      y = 25;
    } else {
      y = height - 35;
    }
    
    if (position.endsWith('center')) {
      x = (width - textWidth) / 2;
    } else if (position.endsWith('right')) {
      x = width - textWidth - 30;
    } else {
      x = 30;
    }
    
    page.drawText(numText, {
      x: x,
      y: y,
      size: size,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  
  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Encrypt a PDF file with a password
 * @param {File} file 
 * @param {string} password 
 * @returns {Promise<Uint8Array>}
 */
async function protectPdf(file, password) {
  const arrayBuffer = await file.arrayBuffer();
  
  // Try using external encryption library first
  if (window.PDFEncrypt && typeof window.PDFEncrypt.encryptPDF === 'function') {
    const uint8Array = new Uint8Array(arrayBuffer);
    return await window.PDFEncrypt.encryptPDF(uint8Array, password);
  } else {
    // If not loaded, output a descriptive error or try basic fallback
    throw new Error("PDF Encryptor CDN script not loaded. Check internet or add the CDN to index.html.");
  }
}

/**
 * Decrypt a password-secured PDF file
 * @param {File} file 
 * @param {string} password 
 * @returns {Promise<Uint8Array>}
 */
async function unlockPdf(file, password) {
  const arrayBuffer = await file.arrayBuffer();
  const { PDFDocument } = window.PDFLib;
  
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      password: password,
      ignoreEncryption: false
    });
    
    return await pdfDoc.save({ useObjectStreams: true });
  } catch (error) {
    throw new Error("Failed to unlock PDF. Please verify your password. Error: " + error.message);
  }
}

/**
 * Simple client-side text summarization logic (Fallback when API keys are not supplied)
 * @param {string} text 
 * @param {string} length 
 * @returns {string}
 */
function mockSummarize(text, length) {
  if (!text) return "No text found in PDF to summarize.";
  
  // Extract sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const totalSentences = sentences.length;
  
  if (totalSentences <= 3) {
    return text;
  }
  
  // Simple TF-IDF approximation based on word frequencies
  const words = text.toLowerCase().match(/\b[a-z]{4,15}\b/g) || [];
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  // Score sentences
  const scoredSentences = sentences.map((s, idx) => {
    let score = 0;
    const sWords = s.toLowerCase().match(/\b[a-z]{4,15}\b/g) || [];
    sWords.forEach(w => score += (freq[w] || 0));
    // Normalize by length a bit, but favor slightly descriptive sentences
    score = score / (1 + Math.log(sWords.length + 1));
    // Boost first sentence slightly as it often summarizes the context
    if (idx === 0) score *= 1.5;
    return { text: s.trim(), score, idx };
  });
  
  // Sort by score
  const sorted = [...scoredSentences].sort((a, b) => b.score - a.score);
  
  let count = length === 'brief' ? 2 : length === 'standard' ? 6 : 12;
  count = Math.min(count, totalSentences);
  
  const topSentences = sorted.slice(0, count)
                             .sort((a, b) => a.idx - b.idx)
                             .map(s => s.text);
                             
  let summary = `[Offline Client-Side Summary]\n\n`;
  if (length === 'brief') {
    summary += topSentences.join(" ");
  } else {
    summary += topSentences.map(s => `• ${s}`).join("\n\n");
  }
  
  return summary;
}

/**
/**
 * Place multiple source pages per output sheet (N-up printing)
 * @param {File} file - Source PDF file
 * @param {object} options - { count, pageSize, orientation, marginPercent, direction, addBorders }
 * @param {function} progressCallback - (currentSheet, totalSheets)
 * @returns {Promise<Uint8Array>}
 */
async function pagesPerSheet(file, options, progressCallback) {
  const { PDFDocument, rgb } = window.PDFLib;

  const { count, pageSize, orientation, marginPercent, direction, addBorders } = options;

  // Define output page dimensions in points (72 pt/inch)
  const pageSizes = {
    a4: [595.28, 841.89],
    letter: [612, 792],
    a3: [841.89, 1190.55]
  };

  const [baseW, baseH] = pageSizes[pageSize] || pageSizes.a4;
  const baseMin = Math.min(baseW, baseH);
  const baseMax = Math.max(baseW, baseH);

  // Load source PDF with pdf-lib for pure vector embedding
  const arrayBuffer = await file.arrayBuffer();
  const srcPdfDoc = await PDFDocument.load(arrayBuffer);
  const numPages = srcPdfDoc.getPageCount();

  // Inspect first page aspect ratio to optimize layout matching PDF24 algorithm
  const srcPages = srcPdfDoc.getPages();
  let sampleW = 595.28, sampleH = 841.89;
  if (srcPages.length > 0) {
    const size = srcPages[0].getSize();
    sampleW = size.width;
    sampleH = size.height;
  }

  // Candidate grid layouts (cols x rows) for each page count
  const candidateGrids = {
    2:  [[2, 1], [1, 2]],
    3:  [[3, 1], [1, 3]],
    4:  [[2, 2], [4, 1], [1, 4]],
    6:  [[3, 2], [2, 3]],
    8:  [[4, 2], [2, 4]],
    9:  [[3, 3]],
    12: [[4, 3], [3, 4]],
    16: [[4, 4]]
  };
  const gridsToTest = candidateGrids[count] || [[Math.ceil(Math.sqrt(count)), Math.ceil(count / Math.ceil(Math.sqrt(count)))]];

  // Candidate sheet dimensions based on orientation
  let sheetSizesToTest = [];
  if (orientation === 'landscape') {
    sheetSizesToTest.push([baseMax, baseMin]);
  } else if (orientation === 'portrait') {
    sheetSizesToTest.push([baseMin, baseMax]);
  } else {
    // Auto: test both portrait and landscape
    sheetSizesToTest.push([baseMin, baseMax], [baseMax, baseMin]);
  }

  // Calculate margin in px (if user set 0%, marginPx is 0)
  // For PDF24 algorithm: when margin is 0, gap is 0 so images fill seamlessly without whitespace
  const marginFactor = (marginPercent || 0) / 100;
  
  let bestConfig = null;
  let maxRenderScale = -1;

  for (const [sW, sH] of sheetSizesToTest) {
    const mPx = marginFactor * Math.min(sW, sH);
    const gPx = mPx > 0 ? 4 : 0;
    const uW = sW - mPx * 2;
    const uH = sH - mPx * 2;

    for (const [c, r] of gridsToTest) {
      if (c * r < count) continue;
      const cW = (uW - gPx * (c - 1)) / c;
      const cH = (uH - gPx * (r - 1)) / r;
      const scaleX = cW / sampleW;
      const scaleY = cH / sampleH;
      const rScale = Math.min(scaleX, scaleY);
      if (rScale > maxRenderScale) {
        maxRenderScale = rScale;
        bestConfig = { sheetW: sW, sheetH: sH, cols: c, rows: r, marginPx: mPx, gap: gPx, cellW: cW, cellH: cH };
      }
    }
  }

  const { sheetW, sheetH, cols, rows, marginPx, gap, cellW, cellH } = bestConfig || {
    sheetW: baseMin, sheetH: baseMax, cols: 2, rows: 2, marginPx: 0, gap: 0, cellW: baseMin/2, cellH: baseMax/2
  };

  // How many output sheets do we need?
  const totalSheets = Math.ceil(numPages / count);

  // Create output PDF
  const outPdf = await PDFDocument.create();

  // Embed all source pages at once to preserve vector data and keep it fast
  const embeddedPages = await outPdf.embedPages(srcPages);

  for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
    if (progressCallback) progressCallback(sheetIdx + 1, totalSheets);

    const outPage = outPdf.addPage([sheetW, sheetH]);

    for (let slot = 0; slot < count; slot++) {
      const pageNum = sheetIdx * count + slot + 1; // 1-indexed
      if (pageNum > numPages) break;

      // Determine grid position
      const gridRow = Math.floor(slot / cols);
      let gridCol = slot % cols;

      // RTL: reverse column order
      if (direction === 'rtl') {
        gridCol = cols - 1 - gridCol;
      }

      // Cell origin (PDF coordinates: bottom-left origin)
      const cellX = marginPx + gridCol * (cellW + gap);
      const cellY = sheetH - marginPx - (gridRow + 1) * cellH - gridRow * gap;

      // Use embedded vector page instead of rendering to canvas
      const embeddedPage = embeddedPages[pageNum - 1];
      const srcW = embeddedPage.width;
      const srcH = embeddedPage.height;

      // Scale to fit within cell while keeping aspect ratio
      const scaleX = cellW / srcW;
      const scaleY = cellH / srcH;
      const renderScale = Math.min(scaleX, scaleY);

      const renderW = srcW * renderScale;
      const renderH = srcH * renderScale;

      // Center within cell
      const offsetX = cellX + (cellW - renderW) / 2;
      const offsetY = cellY + (cellH - renderH) / 2;

      outPage.drawPage(embeddedPage, {
        x: offsetX,
        y: offsetY,
        width: renderW,
        height: renderH
      });

      // Draw border around the sub-page
      if (addBorders) {
        const borderColor = rgb(0.7, 0.7, 0.7);
        const lineW = 0.5;

        // Bottom line
        outPage.drawLine({ start: { x: offsetX, y: offsetY }, end: { x: offsetX + renderW, y: offsetY }, thickness: lineW, color: borderColor });
        // Top line
        outPage.drawLine({ start: { x: offsetX, y: offsetY + renderH }, end: { x: offsetX + renderW, y: offsetY + renderH }, thickness: lineW, color: borderColor });
        // Left line
        outPage.drawLine({ start: { x: offsetX, y: offsetY }, end: { x: offsetX, y: offsetY + renderH }, thickness: lineW, color: borderColor });
        // Right line
        outPage.drawLine({ start: { x: offsetX + renderW, y: offsetY }, end: { x: offsetX + renderW, y: offsetY + renderH }, thickness: lineW, color: borderColor });
      }
    }
  }

  return await outPdf.save({ useObjectStreams: true });
}

/**
 * Apply a set of visual edits (Text, Images) to a PDF
 * @param {File} file 
 * @param {Array} editsList 
 * @param {Object} pagesInfo - widths and heights of pages
 * @returns {Promise<Uint8Array>}
 */
async function applyEditsToPdf(file, editsList, pagesInfo) {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();

  for (const edit of editsList) {
    if (edit.pageIndex >= pages.length) continue;
    const page = pages[edit.pageIndex];

    const pInfo = pagesInfo[edit.pageIndex];
    if (!pInfo) continue;

    // Convert Canvas coordinates to PDF coordinates
    // PDF origin is bottom-left. Canvas origin is top-left.
    const scaleX = pInfo.pdfWidth / pInfo.canvasWidth;
    const scaleY = pInfo.pdfHeight / pInfo.canvasHeight;

    const pdfW = edit.width * scaleX;
    const pdfH = edit.height * scaleY;

    const pdfX = edit.x * scaleX;
    // For Y, we must flip the axis. The bottom edge of the element in canvas coordinates:
    const canvasBottomY = edit.y + edit.height;
    const pdfY = (pInfo.canvasHeight - canvasBottomY) * scaleY;

    if (edit.type === 'text') {
      const { r, g, b } = hexToPdfRgb(edit.color, { r: 0, g: 0, b: 0 });

      // The fontSize in canvas pixels needs to be scaled to PDF points
      const scaledFontSize = edit.fontSize * scaleY;

      // We draw text at the top-left of its bounding box.
      // pdfLib drawText y-coordinate is the baseline of the text.
      const baselineY = pdfY + pdfH - scaledFontSize;

      page.drawText(edit.text, {
        x: pdfX,
        y: Math.max(0, baselineY),
        size: scaledFontSize,
        font: font,
        color: rgb(r, g, b),
      });
    } else if (edit.type === 'image') {
      // Fetch dataUrl bytes
      const res = await fetch(edit.dataUrl);
      const imgBytes = await res.arrayBuffer();

      let embeddedImage;
      if (edit.dataUrl.startsWith('data:image/png')) {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      }

      page.drawImage(embeddedImage, {
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH
      });
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Extract embedded images from a PDF and zip them
 * @param {File} file 
 * @param {Object} options - { hq: boolean }
 * @param {function} progressCallback 
 * @returns {Promise<Uint8Array>} ZIP file bytes
 */
async function extractImages(file, options, progressCallback) {
  const pdfjsLib = window.pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const zip = new window.JSZip();
  let imgCount = 0;

  try {
    for (let i = 1; i <= numPages; i++) {
      if (progressCallback) progressCallback(i, numPages);
      
      const page = await pdfDoc.getPage(i);
      const ops = await page.getOperatorList();
      
      for (let j = 0; j < ops.fnArray.length; j++) {
        const fn = ops.fnArray[j];
        if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
          const imgName = ops.argsArray[j][0];
          try {
            const img = await new Promise((resolve) => {
              if (fn === pdfjsLib.OPS.paintInlineImageXObject) {
                resolve(imgName); // For inline it's the image object directly
              } else {
                page.objs.get(imgName, (data) => resolve(data));
              }
            });
            
            if (!img) continue;
            
            imgCount++;
            
            // Render the raw image data to a canvas to get a JPG/PNG
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            const imgData = ctx.createImageData(img.width, img.height);
            
            // Sometimes img.data is RGB, sometimes RGBA, sometimes it's a native Image element
            if (img.data && img.data.length) {
              // pdf.js usually provides RGBA or RGB
              if (img.data.length === img.width * img.height * 4) {
                imgData.data.set(img.data);
              } else if (img.data.length === img.width * img.height * 3) {
                let srcPtr = 0, destPtr = 0;
                while (srcPtr < img.data.length) {
                  imgData.data[destPtr++] = img.data[srcPtr++];
                  imgData.data[destPtr++] = img.data[srcPtr++];
                  imgData.data[destPtr++] = img.data[srcPtr++];
                  imgData.data[destPtr++] = 255; // Alpha
                }
              } else {
                 // Grayscale or other format, fallback:
                 ctx.fillStyle = 'white';
                 ctx.fillRect(0,0, canvas.width, canvas.height);
                 canvas.width = 0;
                 canvas.height = 0;
                 continue; 
              }
              ctx.putImageData(imgData, 0, 0);
            } else if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
               ctx.drawImage(img, 0, 0);
            } else {
               canvas.width = 0;
               canvas.height = 0;
               continue;
            }
            
            // Default to PNG to avoid loss, but if HQ is off, we can use JPG
            const type = options.hq ? 'image/png' : 'image/jpeg';
            const ext = options.hq ? 'png' : 'jpg';
            const dataUrl = canvas.toDataURL(type, 0.9);
            
            // Immediately clean up canvas buffer
            canvas.width = 0;
            canvas.height = 0;

            const base64Data = dataUrl.split(',')[1];
            zip.file(`image_p${i}_${imgCount}.${ext}`, base64Data, {base64: true});
          } catch (e) {
            console.warn("Could not extract image on page", i, e);
          }
        }
      }

      page.cleanup();
    }
    
    if (imgCount === 0) {
      throw new Error("No embedded images were found in this document.");
    }
    
    const content = await zip.generateAsync({ type: "uint8array" });
    return content;
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
}

/**
 * Flatten PDF forms
 */
async function flattenPdf(file) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
  const form = pdfDoc.getForm();
  if (form) form.flatten();
  return await pdfDoc.save();
}

/**
 * Edit PDF Metadata
 */
async function editMetadata(file, title, author, subject, clearAll) {
  const pdfDoc = await loadPdfDocument(file);
  
  if (clearAll) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  } else {
    if (title) pdfDoc.setTitle(title);
    if (author) pdfDoc.setAuthor(author);
    if (subject) pdfDoc.setSubject(subject);
  }
  return await pdfDoc.save();
}

/**
 * Crop PDF margins
 */
async function cropPdf(file, marginSize) {
  const pdfDoc = await loadPdfDocument(file);
  const pages = pdfDoc.getPages();
  const cropAmount = parseInt(marginSize, 10);
  
  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.setCropBox(cropAmount, cropAmount, width - cropAmount * 2, height - cropAmount * 2);
  });
  return await pdfDoc.save();
}

/**
 * Change Page Size
 */
async function changePageSize(file, targetSize, scaleMode) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await loadPdfDocument(file);
  const outPdf = await PDFDocument.create();
  
  const dims = getPageDimensions(targetSize);
  const pages = pdfDoc.getPages();
  
  for (const page of pages) {
    const embeddedPage = await outPdf.embedPage(page);
    const { width, height } = embeddedPage.scale(1);
    const outPage = outPdf.addPage(dims);
    
    // Fit to page
    const scale = Math.min(dims[0] / width, dims[1] / height);
    const w = width * scale;
    const h = height * scale;
    
    outPage.drawPage(embeddedPage, {
      x: (dims[0] - w) / 2,
      y: (dims[1] - h) / 2,
      width: w,
      height: h
    });
  }
  return await outPdf.save();
}

/**
 * Get dimensions of each page in the PDF
 * @param {File} file 
 * @returns {Promise<Array<{width: number, height: number}>>}
 */
async function getPdfPageInfo(file) {
  const pdfDoc = await loadPdfDocument(file);
  const pages = pdfDoc.getPages();
  return pages.map(p => {
    const { width, height } = p.getSize();
    return { width, height };
  });
}

/**
 * Render a single PDF page to a canvas with automatic memory cleanup
 * @param {File} file 
 * @param {number} pageIndex 
 * @param {HTMLCanvasElement} canvas 
 * @param {number} scale 
 * @returns {Promise<{width: number, height: number}>}
 */
async function renderPdfPageToCanvas(file, pageIndex, canvas, scale = 1.0) {
  const pdfjsLib = window.pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  try {
    const page = await pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    page.cleanup();
    return { width: viewport.width, height: viewport.height };
  } finally {
    try {
      await pdfDoc.cleanup();
      await pdfDoc.destroy();
    } catch { }
  }
}

window.pdfTools = { 
  mergePdfs, 
  splitPdf, 
  organizePdf, 
  compressPdf, 
  ocrPdf, 
  ocrPdfToSearchablePdf, 
  jpgToPdf, 
  pdfToJpg, 
  pdfToText, 
  htmlToPdf, 
  addWatermark, 
  addPageNumbers, 
  protectPdf, 
  unlockPdf, 
  mockSummarize, 
  pagesPerSheet, 
  applyEditsToPdf, 
  extractImages, 
  flattenPdf, 
  editMetadata, 
  cropPdf, 
  changePageSize,
  getPdfPageInfo,
  renderPdfPageToCanvas
};
