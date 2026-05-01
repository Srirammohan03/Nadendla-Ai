"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepResearch = exports.draftEmail = exports.autoScoutSchedule = exports.dailyScout = void 0;
// functions/src/index.ts
const dotenv = __importStar(require("dotenv"));
dotenv.config();
console.log("Gemini Key Exists:", process.env.GEMINI_API_KEY ? "YES" : "NO");
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const cors_1 = __importDefault(require("cors"));
const crypto = __importStar(require("crypto"));
const config_1 = require("./config");
const gemini_1 = require("./gemini");
const scraper_1 = require("./scraper");
// ======================================================
// FIREBASE INIT
// ======================================================
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ======================================================
// CORS
// ======================================================
const corsHandler = (0, cors_1.default)({
    origin: true,
    credentials: true,
});
// ======================================================
// HELPERS
// ======================================================
const generateLeadId = (portalId, plotNo, companyName) => {
    const raw = `${portalId}-${plotNo || "no-plot"}-${companyName || "no-name"}`;
    return crypto.createHash("md5").update(raw).digest("hex");
};
const handleOptions = (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
};
// ======================================================
// DAILY SCOUT
// ======================================================
exports.dailyScout = functions
    .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
})
    .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (handleOptions(req, res))
            return;
        try {
            const targetPortalId = req.body?.portalId;
            const portalsToProcess = targetPortalId
                ? config_1.PORTALS.filter((p) => p.id === targetPortalId)
                : config_1.PORTALS;
            const results = {
                mode: targetPortalId ? `Single State: ${targetPortalId}` : "All States",
                scanned: 0,
                parsed: 0,
                added: 0,
                errors: [],
            };
            console.log(`🚀 Starting Scout routine. Mode: ${results.mode}`);
            for (const portal of portalsToProcess) {
                try {
                    console.log(`\n--- Processing: ${portal.name} ---`);
                    const targetUrl = portal.allotmentPath && portal.allotmentPath.length > 0
                        ? `${portal.url}${portal.allotmentPath[0]}`
                        : portal.dataUrl;
                    console.log(`🎯 Target URL for ${portal.name}: ${targetUrl}`);
                    const html = await (0, scraper_1.fetchPageContent)(targetUrl, portal.id);
                    console.log(`📄 Fetched HTML length for ${portal.name}: ${html?.length || 0}`);
                    console.log(`🌐 Portal URL: ${targetUrl}`);
                    // FOR TESTING ONLY: Injecting dummy text to prove pipeline works
                    // REMOVE THIS ONCE YOU WRITE YOUR PDF SCRAPER!
                    const dataToParse = html;
                    console.log("--- RAW TEXT START ---");
                    console.log(html?.substring(0, 2000)); // Print the first 2000 characters to your terminal
                    console.log("--- RAW TEXT END ---");
                    if (!dataToParse || dataToParse.length < 50) {
                        const msg = `Skipping ${portal.name}: Empty or invalid content`;
                        console.warn(msg);
                        results.errors.push(msg);
                        continue;
                    }
                    results.scanned++;
                    let extractedData = [];
                    try {
                        extractedData = await (0, gemini_1.parseHtmlWithGemini)(dataToParse);
                        console.log(`🧠 Extracted leads for ${portal.name}:`, extractedData);
                        console.log(`📊 Total extracted count: ${extractedData.length}`);
                    }
                    catch (parseError) {
                        const msg = `Parsing failed for ${portal.name}: ${parseError.message}`;
                        console.error(msg);
                        results.errors.push(msg);
                        continue;
                    }
                    if (!extractedData.length) {
                        console.log(`⚠️ No valid leads found in ${portal.name}`);
                        continue;
                    }
                    results.parsed += extractedData.length;
                    const batch = db.batch();
                    let batchCount = 0;
                    // Gather new unique leads first
                    const newValidLeads = [];
                    for (const item of extractedData) {
                        try {
                            if (!item.CompanyName && !item.PlotNo)
                                continue;
                            const leadId = generateLeadId(portal.id, item.PlotNo, item.CompanyName);
                            const force = req.query.force === "true";
                            const leadRef = db.collection("leads").doc(leadId);
                            const existingDoc = await leadRef.get();
                            if (existingDoc.exists && !force) {
                                console.log(`⏩ Duplicate skipped: ${item.CompanyName}`);
                                continue;
                            }
                            newValidLeads.push({ item, leadId });
                        }
                        catch (leadCheckError) {
                            console.error("Error checking existing lead", leadCheckError);
                        }
                    }
                    if (newValidLeads.length > 0) {
                        console.log(`🔍 Bulk Enriching ${newValidLeads.length} leads for ${portal.name}...`);
                        const companyNames = newValidLeads
                            .map(nl => nl.item.CompanyName)
                            .filter(Boolean);
                        // Bulk fetch both Enrichment AND Decision Makers in 1 API call!
                        const bulkData = await (0, gemini_1.bulkDeepResearchWithGemini)(companyNames, portal.name);
                        for (const { item, leadId } of newValidLeads) {
                            const leadRef = db.collection("leads").doc(leadId);
                            const companyNameStr = item.CompanyName || "";
                            const enriched = bulkData[companyNameStr] || {
                                sector: "Manufacturing",
                                website: null,
                                summary: `Industrial facility in ${portal.name}`,
                                decisionMakers: []
                            };
                            const leadPayload = {
                                companyName: item.CompanyName || null,
                                plotNo: item.PlotNo || null,
                                acreage: item.Acreage || null,
                                date: item.Date || null,
                                portalId: portal.id,
                                portalName: portal.name,
                                sourceUrl: targetUrl,
                                sector: enriched.sector || "Manufacturing",
                                website: enriched.website || null,
                                summary: enriched.summary || null,
                                decisionMakers: enriched.decisionMakers || [],
                                status: (enriched.decisionMakers && enriched.decisionMakers.length > 0) ? 'researched' : 'new',
                                // Use Timestamp.fromDate for emulator compatibility
                                createdAt: firestore_1.Timestamp.fromDate(new Date()),
                                updatedAt: firestore_1.Timestamp.fromDate(new Date()),
                                lastResearched: firestore_1.Timestamp.fromDate(new Date()),
                            };
                            batch.set(leadRef, leadPayload);
                            batchCount++;
                            results.added++;
                        }
                        await batch.commit();
                        console.log(`✅ Successfully committed ${batchCount} new leads for ${portal.name}`);
                    }
                    else {
                        console.log(`⚠️ No new leads to commit for ${portal.name}`);
                    }
                }
                catch (portalError) {
                    const msg = `Portal failed (${portal.name}): ${portalError.message}`;
                    console.error(msg);
                    results.errors.push(msg);
                }
            }
            console.log("🏁 Scout complete.", results);
            return res.status(200).json({
                success: true,
                results,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("💥 Critical Scout Error:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Internal Server Error",
                timestamp: new Date().toISOString(),
            });
        }
    });
});
// ======================================================
// SCHEDULED SCOUT (Runs every 15 days automatically)
// ======================================================
exports.autoScoutSchedule = functions
    .runWith({ timeoutSeconds: 540, memory: "2GB" })
    .pubsub
    .schedule('0 0 */15 * *') // Runs at midnight every 15 days
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
    console.log("⏰ Starting 15-day auto-scout schedule...");
    for (const portal of config_1.PORTALS) {
        try {
            const targetUrl = portal.allotmentPath && portal.allotmentPath.length > 0
                ? `${portal.url}${portal.allotmentPath[0]}`
                : portal.dataUrl;
            const html = await (0, scraper_1.fetchPageContent)(targetUrl, portal.id);
            if (!html || html.length < 50)
                continue;
            const extractedData = await (0, gemini_1.parseHtmlWithGemini)(html);
            if (!extractedData.length)
                continue;
            const batch = db.batch();
            let batchCount = 0;
            const newValidLeads = [];
            for (const item of extractedData) {
                if (!item.CompanyName && !item.PlotNo)
                    continue;
                const leadId = generateLeadId(portal.id, item.PlotNo, item.CompanyName);
                const leadRef = db.collection("leads").doc(leadId);
                const existingDoc = await leadRef.get();
                if (existingDoc.exists)
                    continue;
                newValidLeads.push({ item, leadId });
            }
            if (newValidLeads.length > 0) {
                const companyNames = newValidLeads.map(nl => nl.item.CompanyName).filter(Boolean);
                const bulkData = await (0, gemini_1.bulkDeepResearchWithGemini)(companyNames, portal.name);
                for (const { item, leadId } of newValidLeads) {
                    const leadRef = db.collection("leads").doc(leadId);
                    const companyNameStr = item.CompanyName || "";
                    const enriched = bulkData[companyNameStr] || { sector: "Manufacturing", website: null, summary: null, decisionMakers: [] };
                    batch.set(leadRef, {
                        companyName: item.CompanyName || null,
                        plotNo: item.PlotNo || null,
                        acreage: item.Acreage || null,
                        date: item.Date || null,
                        portalId: portal.id,
                        portalName: portal.name,
                        sourceUrl: targetUrl,
                        sector: enriched.sector || "Manufacturing",
                        website: enriched.website || null,
                        summary: enriched.summary || null,
                        decisionMakers: enriched.decisionMakers || [],
                        status: (enriched.decisionMakers && enriched.decisionMakers.length > 0) ? 'researched' : 'new',
                        createdAt: firestore_1.Timestamp.fromDate(new Date()),
                        updatedAt: firestore_1.Timestamp.fromDate(new Date()),
                        lastResearched: firestore_1.Timestamp.fromDate(new Date()),
                    });
                    batchCount++;
                }
                await batch.commit();
                console.log(`✅ Auto-scout committed ${batchCount} leads for ${portal.name}`);
            }
        }
        catch (error) {
            console.error(`❌ Auto-scout failed for ${portal.name}:`, error);
        }
    }
    return null;
});
// ======================================================
// DRAFT EMAIL
// ======================================================
exports.draftEmail = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (handleOptions(req, res))
            return;
        try {
            const { lead } = req.body;
            if (!lead?.companyName) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid lead data - companyName required",
                    timestamp: new Date().toISOString(),
                });
            }
            const draft = await (0, gemini_1.generateEmailDraft)(lead.companyName, lead.plotNo || "allocated plot", lead.sector || "Infrastructure");
            return res.status(200).json({
                success: true,
                subject: draft.subject,
                body: draft.body,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            console.error("❌ Email draft error:", e);
            return res.status(500).json({
                success: false,
                error: e.message,
                timestamp: new Date().toISOString(),
            });
        }
    });
});
// ======================================================
// DEEP RESEARCH
// ======================================================
exports.deepResearch = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (handleOptions(req, res))
            return;
        try {
            const { leadId, companyName } = req.body;
            if (!companyName) {
                return res.status(400).json({
                    success: false,
                    error: "Missing company name",
                    timestamp: new Date().toISOString(),
                });
            }
            const decisionMakers = await (0, gemini_1.deepResearchWithGemini)(companyName);
            if (leadId) {
                await db.collection("leads").doc(leadId).update({
                    decisionMakers,
                    lastResearched: firestore_1.Timestamp.fromDate(new Date()),
                });
            }
            return res.status(200).json({
                success: true,
                decisionMakers,
                count: decisionMakers.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            console.error("❌ Deep Research Error:", e);
            return res.status(500).json({
                success: false,
                error: e.message,
                decisionMakers: [],
                timestamp: new Date().toISOString(),
            });
        }
    });
});
// (Demo data endpoints removed)
