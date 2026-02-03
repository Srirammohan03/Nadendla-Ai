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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const crypto = __importStar(require("crypto"));
const config_1 = require("./config");
const gemini_1 = require("./gemini");
// Import the new robust scraper
const scraper_1 = require("./scraper");
const seedData_1 = require("./seedData");
admin.initializeApp();
const db = admin.firestore();
const corsHandler = (0, cors_1.default)({ origin: true });
// --- Helper Functions ---
// 2. Deduplication Key Generator
const generateLeadId = (portalId, plotNo, companyName) => {
    const raw = `${portalId}-${plotNo || 'no-plot'}-${companyName || 'no-name'}`;
    return crypto.createHash('md5').update(raw).digest('hex');
};
// --- Cloud Functions ---
// The Main Scout Engine
// IMPORTANT: Puppeteer requires more memory (2GB) and longer timeout
exports.dailyScout = functions
    .runWith({
    timeoutSeconds: 540,
    memory: "2GB" // Required for Headless Chrome
})
    .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        // Check if we are scouting a specific portal or all of them
        const targetPortalId = req.body.portalId;
        // Filter portals based on request
        const portalsToProcess = targetPortalId
            ? config_1.PORTALS.filter(p => p.id === targetPortalId)
            : config_1.PORTALS;
        const results = {
            mode: targetPortalId ? `Single State: ${targetPortalId}` : 'All States',
            scanned: 0,
            parsed: 0,
            added: 0,
            errors: []
        };
        try {
            console.log(`Starting Scout routine. Mode: ${results.mode}`);
            // Iterate over Configured Portals
            for (const portal of portalsToProcess) {
                console.log(`\n--- Processing: ${portal.name} ---`);
                // 1. Fetch using Robust Scraper (Puppeteer)
                const html = await (0, scraper_1.fetchPageContent)(portal.url);
                if (!html) {
                    const msg = `Skipping ${portal.name}: Fetch returned empty/null.`;
                    console.warn(msg);
                    results.errors.push(msg);
                    continue;
                }
                results.scanned++;
                // 2. AI Parsing
                let extractedData = [];
                try {
                    extractedData = await (0, gemini_1.parseHtmlWithGemini)(html);
                }
                catch (parseError) {
                    const msg = `Parsing failed for ${portal.name}: ${parseError.message}`;
                    console.error(msg);
                    results.errors.push(msg);
                    continue;
                }
                if (extractedData.length === 0) {
                    console.log(`No valid leads found in ${portal.name}.`);
                    continue;
                }
                results.parsed += extractedData.length;
                // 3. Process & Store Leads
                const batch = db.batch();
                let batchCount = 0;
                for (const item of extractedData) {
                    if (!item.CompanyName && !item.PlotNo)
                        continue;
                    const leadId = generateLeadId(portal.id, item.PlotNo, item.CompanyName);
                    const leadRef = db.collection('leads').doc(leadId);
                    // Deduplication Check
                    const doc = await leadRef.get();
                    if (doc.exists) {
                        continue;
                    }
                    // Enrichment (Sector + Contact Discovery via Google Search)
                    console.log(`Deep searching for: ${item.CompanyName}...`);
                    const enriched = await (0, gemini_1.enrichLeadWithGemini)(item.CompanyName || '', portal.name);
                    // Create Payload
                    const leadPayload = {
                        companyName: item.CompanyName,
                        plotNo: item.PlotNo,
                        acreage: item.Acreage,
                        date: item.Date,
                        portalId: portal.id,
                        sourceUrl: portal.url,
                        sector: enriched.sector,
                        website: enriched.website,
                        contactEmail: enriched.email,
                        contactPhone: enriched.phone,
                        summary: enriched.summary,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    batch.set(leadRef, leadPayload);
                    batchCount++;
                    results.added++;
                }
                if (batchCount > 0) {
                    await batch.commit();
                    console.log(`Successfully committed ${batchCount} new leads for ${portal.name}`);
                }
            }
            console.log("Scout complete.", results);
            // Return 200 OK with success flag
            res.json({
                success: true,
                results,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error("Critical Scout Error:", error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});
// Draft Email Endpoint
exports.draftEmail = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        const { lead } = req.body;
        if (!lead || !lead.companyName) {
            res.status(400).json({
                success: false,
                error: "Invalid lead data - companyName required",
                timestamp: new Date().toISOString()
            });
            return;
        }
        try {
            const draft = await (0, gemini_1.generateEmailDraft)(lead.companyName, lead.plotNo || "allocated plot", lead.sector || "Infrastructure");
            res.json({
                success: true,
                subject: draft.subject,
                body: draft.body,
                timestamp: new Date().toISOString()
            });
        }
        catch (e) {
            console.error("Email draft error:", e);
            res.status(500).json({
                success: false,
                error: e.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});
// Deep Research Endpoint
exports.deepResearch = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        const { leadId, companyName } = req.body;
        if (!companyName) {
            res.status(400).json({
                success: false,
                error: "Missing company name",
                timestamp: new Date().toISOString()
            });
            return;
        }
        try {
            // Get decision makers from Gemini
            const decisionMakers = await (0, gemini_1.deepResearchWithGemini)(companyName);
            // Update Firestore if leadId provided
            if (leadId) {
                try {
                    await db.collection('leads').doc(leadId).update({
                        decisionMakers: decisionMakers,
                        lastResearched: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                catch (updateError) {
                    console.warn("Could not update Firestore:", updateError);
                }
            }
            res.json({
                success: true,
                decisionMakers: decisionMakers,
                count: decisionMakers.length,
                timestamp: new Date().toISOString()
            });
        }
        catch (e) {
            console.error("Deep Research Error:", e);
            res.status(500).json({
                success: false,
                error: e.message,
                decisionMakers: [],
                timestamp: new Date().toISOString()
            });
        }
    });
});
// ✅ SEED DUMMY DATA (Repeatable Cloud Function)
exports.seedDummyData = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const result = await (0, seedData_1.generateDummyLeads)();
            return res.status(200).json({
                success: result.success,
                count: result.count,
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }
        catch (e) {
            console.error('Seed error:', e);
            return res.status(500).json({
                success: false,
                message: `Error: ${e.message}`,
                count: 0,
                timestamp: new Date().toISOString()
            });
        }
    });
});
// ✅ CLEAR DEMO DATA (Delete all isDemoData: true records)
exports.clearDemoDataFunction = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const result = await (0, seedData_1.clearDemoData)();
            return res.status(200).json({
                success: result.success,
                count: result.count,
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }
        catch (e) {
            console.error('Clear error:', e);
            return res.status(500).json({
                success: false,
                message: `Error: ${e.message}`,
                count: 0,
                timestamp: new Date().toISOString()
            });
        }
    });
});
