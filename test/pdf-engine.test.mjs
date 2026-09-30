/**
 * Automated Verification Test for OmniPDF Engine
 */
import { PDFEngine } from '../src/pdf-engine.js';
import { PDFDocument } from 'pdf-lib';
import assert from 'assert';

async function createSamplePDF(pageCount = 3, textPrefix = 'Page') {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`${textPrefix} ${i + 1}`, { x: 50, y: 500, size: 24 });
  }
  return await doc.save();
}

async function runTests() {
  console.log('🧪 Starting OmniPDF Engine automated verification tests...');

  // Test 1: Merge PDFs
  console.log('\n[1/8] Testing Merge PDF...');
  const pdf1 = await createSamplePDF(2, 'Document 1 Page');
  const pdf2 = await createSamplePDF(3, 'Document 2 Page');
  const mergeResult = await PDFEngine.mergePDFs([pdf1, pdf2]);
  const mergedLoaded = await PDFDocument.load(mergeResult.bytes);
  assert.strictEqual(mergedLoaded.getPageCount(), 5, 'Merged PDF should have 5 pages');
  console.log('✅ Merge PDF passed: 2 + 3 = 5 pages.');

  // Test 2: Split PDF (Custom Range)
  console.log('\n[2/8] Testing Split PDF...');
  const sample = await createSamplePDF(5, 'Split Page');
  const splitResult = await PDFEngine.splitPDF(sample, 'custom', '2-4');
  const splitLoaded = await PDFDocument.load(splitResult.bytes);
  assert.strictEqual(splitLoaded.getPageCount(), 3, 'Split range 2-4 should have 3 pages');
  console.log('✅ Split PDF passed: extracted 3 pages.');

  // Test 3: Extract Pages
  console.log('\n[3/8] Testing Extract Pages...');
  const extractResult = await PDFEngine.extractPages(sample, '1, 3, 5');
  const extractLoaded = await PDFDocument.load(extractResult.bytes);
  assert.strictEqual(extractLoaded.getPageCount(), 3, 'Extracted 1, 3, 5 should have 3 pages');
  console.log('✅ Extract Pages passed.');

  // Test 4: Delete Pages
  console.log('\n[4/8] Testing Delete Pages...');
  const deleteResult = await PDFEngine.deletePages(sample, '2, 4');
  const deleteLoaded = await PDFDocument.load(deleteResult.bytes);
  assert.strictEqual(deleteLoaded.getPageCount(), 3, 'Deleting 2 of 5 pages should leave 3 pages');
  console.log('✅ Delete Pages passed: 5 - 2 = 3 pages.');

  // Test 5: Rotate PDF
  console.log('\n[5/8] Testing Rotate PDF...');
  const rotateResult = await PDFEngine.rotatePDF(sample, 90, '1-2');
  const rotateLoaded = await PDFDocument.load(rotateResult.bytes);
  const p1Angle = rotateLoaded.getPage(0).getRotation().angle;
  assert.strictEqual(p1Angle, 90, 'Page 1 should be rotated by 90 degrees');
  console.log('✅ Rotate PDF passed: Page 1 angle is 90 degrees.');

  // Test 6: Add Watermark
  console.log('\n[6/8] Testing Add Watermark...');
  const watermarkResult = await PDFEngine.addWatermark(sample, 'CONFIDENTIAL TEST');
  assert(watermarkResult.bytes.byteLength > 0, 'Watermarked PDF should have bytes');
  console.log('✅ Watermark passed.');

  // Test 7: Add Page Numbers
  console.log('\n[7/8] Testing Add Page Numbers...');
  const numberResult = await PDFEngine.addPageNumbers(sample, 'Page {n} of {total}');
  assert(numberResult.bytes.byteLength > 0, 'Numbered PDF should have bytes');
  console.log('✅ Page Numbers passed.');

  // Test 8: Metadata Editing
  console.log('\n[8/8] Testing Metadata Editing...');
  const metaResult = await PDFEngine.updateMetadata(sample, {
    title: 'Capstone PDF Report',
    author: 'VelAstra',
    subject: 'PDF Offline Tool'
  });
  const metaLoaded = await PDFDocument.load(metaResult.bytes);
  assert.strictEqual(metaLoaded.getTitle(), 'Capstone PDF Report', 'Title should match');
  assert.strictEqual(metaLoaded.getAuthor(), 'VelAstra', 'Author should match');
  console.log('✅ Metadata editing passed.');

  console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! The PDF Engine is 100% operational.');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
