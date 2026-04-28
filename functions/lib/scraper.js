"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPageContent = void 0;
// functions/src/scraper.ts
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const puppeteer_1 = require("puppeteer");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
// Known industrial land allotment page patterns for each portal
const PORTAL_ALLOTMENT_PATHS = {
    "TG_TGIIC": ["/land/allotments", "/land-allotment", "/industrial-land", "/allotments"],
    "TN_SIPCOT": ["/land-allotment", "/land-allotments", "/allotment-list", "/industrial-plots"],
    "AP_APIIC": ["/land-allotment", "/land-allotments", "/industrial-plots", "/allotments"],
    "GJ_GIDC": ["/land-allotment", "/land-allotments", "/industrial-plots", "/plot-allotment"],
    "KA_KIADB": ["/land-allotments", "/industrial-plots", "/allotments", "/plots"],
    "MH_MIDC": ["/land-allotment", "/industrial-plots", "/allotments", "/available-plots"],
    "RJ_RIICO": ["/land-allotment", "/industrial-plots", "/allotments", "/plots"],
    "MP_MPIDC": ["/mpidc/land-allotment", "/land-allotment", "/industrial-plots"],
    "OD_IDCO": ["/land-allotment", "/industrial-plots", "/allotments"],
    "HR_HSIIDC": ["/industrial-land", "/land-allotment", "/allotments"],
    "PB_PSIEC": ["/land-allotment", "/industrial-plots", "/allotments"],
    "KL_KINFRA": ["/land-allotment", "/industrial-plots", "/allotments"],
    "CG_CSIDC": ["/land-allotment", "/industrial-plots", "/allotments"],
    "BR_BIADA": ["/land-allotment", "/industrial-plots", "/allotments"],
    "UP_UPSIDA": ["/land-allotment", "/industrial-plots", "/allotments"],
    "WB_WBIIDC": ["/land-allotment", "/industrial-plots", "/allotments"],
};
const fetchPageContent = async (url, portalId) => {
    let browser = null;
    try {
        console.log(`[Scraper] Launching Stealth Browser for: ${url}`);
        browser = await puppeteer_extra_1.default.launch({
            headless: true,
            executablePath: (0, puppeteer_1.executablePath)(),
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-web-security",
            ],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 900 });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36");
        page.setDefaultNavigationTimeout(120000);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
        console.log(`[Scraper] Initial URL: ${page.url()}`);
        if (portalId && PORTAL_ALLOTMENT_PATHS[portalId]) {
            const baseUrl = new URL(url).origin;
            for (const path of PORTAL_ALLOTMENT_PATHS[portalId]) {
                try {
                    const fullUrl = `${baseUrl}${path}`;
                    console.log(`[Scraper] Trying path: ${fullUrl}`);
                    await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 60000 });
                    // 🔥 FIX 1: THE HARD WAIT 🔥
                    console.log(`[Scraper] Waiting 8 seconds for slow government APIs to load...`);
                    await new Promise((r) => setTimeout(r, 8000));
                    const html = await page.content();
                    if (html.includes("allot") || html.includes("plot") || html.includes("industrial")) {
                        console.log(`[Scraper] Valid allotment path confirmed.`);
                        break;
                    }
                }
                catch (err) {
                    console.log(`[Scraper] Failed path: ${path}`);
                }
            }
        }
        // 🔥 FIX 2: THE PURE TEXT EXTRACTOR 🔥
        // Instead of looking for HTML tables (which gov sites mess up),
        // we grab the raw, visible text exactly as a human sees it on the screen.
        console.log(`[Scraper] Extracting raw visible text to feed Gemini...`);
        let extractedText = await page.evaluate(() => {
            // Bypassing TS errors using globalThis
            const doc = globalThis.document;
            return (doc && doc.body && doc.body.innerText) || "";
        });
        // Grab text from all iframes too (this is usually where gov sites hide the data)
        const frames = page.frames();
        for (const frame of frames) {
            try {
                const frameText = await frame.evaluate(() => {
                    const doc = globalThis.document;
                    return (doc && doc.body && doc.body.innerText) || "";
                });
                if (frameText && frameText.trim().length > 100) {
                    extractedText += "\n\n--- FRAME CONTENT ---\n\n" + frameText;
                }
            }
            catch (e) {
                continue;
            }
        }
        console.log(`[Scraper] Extracted text payload size: ${extractedText.length} characters.`);
        if (!extractedText || extractedText.length < 50) {
            return null;
        }
        return extractedText;
    }
    catch (error) {
        console.error(`[Scraper Failed] ${url}:`, error.message);
        return null;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
};
exports.fetchPageContent = fetchPageContent;
// ======================================================
// HTML QUALITY SCORER (Kept for compatibility, though largely unused now)
// ======================================================
const scoreHtml = (html) => {
    let score = 0;
    const lower = html.toLowerCase();
    if (lower.includes("<table"))
        score += 50;
    if (lower.includes("allot"))
        score += 40;
    if (lower.includes("plot"))
        score += 30;
    if (lower.includes("industrial"))
        score += 30;
    if (lower.includes("company"))
        score += 20;
    if (lower.includes("acre"))
        score += 20;
    if (lower.includes("survey"))
        score += 15;
    score += Math.min(html.length / 5000, 30);
    return score;
};
// for (const selector of candidateSelectors) {
//   const link = await page.$(selector);
//   if (link) {
//     console.log(`[Scraper] Found link: ${selector}`);
//     try {
//       await Promise.all([
//         link.click(),
//         page.waitForNavigation({
//           waitUntil: "domcontentloaded",
//           timeout: 60000,
//         }).catch(() => null),
//       ]);
//       await new Promise((resolve) => setTimeout(resolve, 4000));
//       break;
//     } catch (e: any) {
//       console.warn(`[Scraper] Click failed: ${e.message}`);
//     }
//   }
// }
// try {
//   await Promise.race([
//     page.waitForSelector("table", { timeout: 8000 }),
//     page.waitForSelector(".grid", { timeout: 8000 }),
//     page.waitForSelector(".data-table", { timeout: 8000 }),
//     page.waitForSelector("iframe", { timeout: 5000 }),
//     new Promise((resolve) => setTimeout(resolve, 4000)),
//   ]);
// } catch {
//   console.log(`[Scraper] No table detected quickly.`);
// }
// let content = await page.content();
// const frames = page.frames();
// if (content.length < 5000 && frames.length > 1) {
//   for (const frame of frames) {
//     try {
//       const frameContent = await frame.content();
//       if (frameContent.length > content.length) {
//         content = frameContent;
//       }
//     } catch {
//       continue;
//     }
//   }
// }
// console.log(`[Scraper] HTML size: ${content.length}`);
// if (!content || content.length < 1000) {
//   return null;
// }
// return content;
//   } catch (error: any) {
//   console.error(`[Scraper Failed] ${url}:`, error.message);
//   return null;
// } finally {
//   if (browser) {
//     await browser.close();
//   }
// }
// };
