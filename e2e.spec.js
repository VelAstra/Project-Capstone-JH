const { test, expect } = require('@playwright/test');
const path = require('path');

test('Test all PDF Tools', async ({ page }) => { test.setTimeout(120000); 
  // Listen for unhandled errors
  page.on('pageerror', error => {
    console.error('Uncaught error:', error);
  });
  
  // Forward console logs
  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.text()}`);
  });

  // Intercept alerts so they don't block
  page.on('dialog', async dialog => {
    console.log('Dialog message:', dialog.message());
    await dialog.accept();
  });

  // Navigate to local index.html
  const filePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
  await page.goto(filePath);
  await page.evaluate(() => { window.electron = { convertPptx: async () => new Uint8Array([37,80,68,70,45,49,46,52,10,37,226,227,207,211,10]).buffer }; });

  // Tools to test
  const tools = [
    'split', 'organize', 'rotate', 'remove', 'extract', 'extract-images', 'compress', 
    'ocr', 'jpg-to-pdf', 'pdf-to-jpg', 'pdf-to-text', 'watermark', 'page-numbers', 
    'flatten-pdf', 'edit-metadata', 'crop-pdf', 'change-page-size', 'ppt-to-pdf'
  ];

  for (const tool of tools) {
    console.log(`\nTesting tool: ${tool}`);
    // Click the tool card
    const card = await page.locator(`.tool-card[data-target="${tool}"]`);
    if (await card.count() > 0) {
      await card.click();
      
      // Wait a moment for UI to update
      await page.waitForTimeout(500);
      await page.screenshot({ path: `after-click-${tool}.png`, fullPage: true });
      
      // Upload dummy PDF (except for jpg-to-pdf which needs jpg)
      
      if (tool === 'ppt-to-pdf') {
        await page.locator('#file-input').setInputFiles('dummy.pptx');
        await page.locator('#btn-process').click();
        try {
          await page.waitForSelector('#result-panel', { state: 'visible', timeout: 5000 });
          console.log('SUCCESS: ' + tool);
        } catch(e) { throw e; }
        await page.locator('#btn-back').click();
        continue;
      }
      if (tool === 'jpg-to-pdf') {

        console.log(`Skipping ${tool} as it requires JPG upload`);
        await page.locator('#btn-back').click();
        continue;
      }
      
      await page.locator('#file-input').setInputFiles('dummy.pdf');
      
      // Some tools need specific config interactions before process
      if (tool === 'split') {
        await page.locator('#tool-configs #split-ranges').fill('1');
      }
      if (tool === 'rotate') {
        await page.locator('#tool-configs #btn-rotate-all-right').click();
      }
      if (tool === 'remove' || tool === 'extract') {
        const pageCard = await page.locator('.page-card').first();
        await pageCard.waitFor({ state: 'visible' });
        await pageCard.click(); 
      }

      // Click Process
      await page.locator('#btn-process-pdf').click();

      // Wait for result panel or error
      try {
        await page.waitForSelector('#result-panel', { state: 'visible', timeout: 5000 });
        console.log(`SUCCESS: ${tool}`);
      } catch (e) {
        console.log(`FAILED or TIMEOUT: ${tool}`);
        await page.screenshot({ path: `failure-${tool}.png`, fullPage: true });
        throw e;
      }

      // Click Back to Dashboard
      await page.evaluate(() => document.getElementById('btn-back-dashboard').click());
    } else {
      console.log(`Tool card ${tool} not found!`);
    }
  }
});
