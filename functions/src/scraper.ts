import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';

// Apply stealth plugin to evade detection
puppeteer.use(StealthPlugin());

/**
 * Robust fetcher that mimics a real browser to handle JS-rendered content (TGIIC, etc.)
 * Mimics "Scrapling" capabilities: Undetectable, Smart Wait, Rendered DOM.
 */
export const fetchPageContent = async (url: string): Promise<string | null> => {
  let browser = null;
  try {
    console.log(`[Scraper] Launching Stealth Browser for: ${url}`);

    // Launch options optimized for Cloud Functions / Serverless
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      // In some serverless envs, you might need to point to a specific chromium executable
      // executablePath: process.env.CHROME_BIN || undefined, 
    });

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate with a generous timeout
    // waitUntil: 'networkidle2' ensures we wait until mostly no more requests are happening (AJAX loaded)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Smart Wait: Try to wait for common data containers to ensure table is rendered
    // We race a few selectors: table, standard grids, or just a short timeout
    try {
      await Promise.race([
        page.waitForSelector('table', { timeout: 5000 }),
        page.waitForSelector('.grid', { timeout: 5000 }),
        page.waitForSelector('.data-table', { timeout: 5000 }),
        new Promise(r => setTimeout(r, 2000)) // Fallback wait
      ]);
    } catch (e) {
      console.log(`[Scraper] No specific table selector found immediately, proceeding with snapshot.`);
    }

    // Capture the fully rendered DOM
    const content = await page.content();

    // Optional: Take a screenshot for debugging if you have storage set up
    // await page.screenshot({ path: '/tmp/debug.png' });

    return content;

  } catch (error: any) {
    console.error(`[Scraper Failed] ${url}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};