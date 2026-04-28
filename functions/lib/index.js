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
exports.clearDemoDataFunction = exports.seedDummyData = exports.deepResearch = exports.draftEmail = exports.dailyScout = void 0;
// functions/src/index.ts
const dotenv = __importStar(require("dotenv"));
dotenv.config();
console.log("Gemini Key Exists:", process.env.GEMINI_API_KEY ? "YES" : "NO");
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const crypto = __importStar(require("crypto"));
const config_1 = require("./config");
const gemini_1 = require("./gemini");
const scraper_1 = require("./scraper");
const seedData_1 = require("./seedData");
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
                    for (const item of extractedData) {
                        try {
                            if (!item.CompanyName && !item.PlotNo)
                                continue;
                            const leadId = generateLeadId(portal.id, item.PlotNo, item.CompanyName);
                            const leadRef = db.collection("leads").doc(leadId);
                            const existingDoc = await leadRef.get();
                            if (existingDoc.exists) {
                                console.log(`⏩ Duplicate skipped: ${item.CompanyName}`);
                                continue;
                            }
                            console.log(`🔍 Enriching lead: ${item.CompanyName}`);
                            const enriched = await (0, gemini_1.enrichLeadWithGemini)(item.CompanyName || "", portal.name);
                            const leadPayload = {
                                companyName: item.CompanyName || null,
                                plotNo: item.PlotNo || null,
                                acreage: item.Acreage || null,
                                date: item.Date || null,
                                portalId: portal.id,
                                portalName: portal.name,
                                sourceUrl: targetUrl,
                                sector: enriched.sector,
                                website: enriched.website,
                                contactEmail: enriched.email,
                                contactPhone: enriched.phone,
                                summary: enriched.summary,
                                // 🔥 THE FIX: Use standard Timestamp.now() to avoid version conflicts 🔥
                                createdAt: admin.firestore.Timestamp.now(),
                                updatedAt: admin.firestore.Timestamp.now(),
                            };
                            batch.set(leadRef, leadPayload);
                            batchCount++;
                            results.added++;
                        }
                        catch (leadError) {
                            console.error(`❌ Lead processing error:`, leadError);
                            results.errors.push(`${portal.name}: ${item.CompanyName || "Unknown"} failed`);
                        }
                    }
                    if (batchCount > 0) {
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
                    lastResearched: admin.firestore.Timestamp.now(),
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
// ======================================================
// SEED DATA
// ======================================================
exports.seedDummyData = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (handleOptions(req, res))
            return;
        try {
            const result = await (0, seedData_1.generateDummyLeads)();
            return res.status(200).json({
                success: result.success,
                count: result.count,
                message: result.message,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            console.error("❌ Seed error:", e);
            return res.status(500).json({
                success: false,
                message: `Error: ${e.message}`,
                count: 0,
                timestamp: new Date().toISOString(),
            });
        }
    });
});
// ======================================================
// CLEAR DEMO DATA
// ======================================================
exports.clearDemoDataFunction = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (handleOptions(req, res))
            return;
        try {
            const result = await (0, seedData_1.clearDemoData)();
            return res.status(200).json({
                success: result.success,
                count: result.count,
                message: result.message,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            console.error("❌ Clear error:", e);
            return res.status(500).json({
                success: false,
                message: `Error: ${e.message}`,
                count: 0,
                timestamp: new Date().toISOString(),
            });
        }
    });
});
