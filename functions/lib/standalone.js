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
Object.defineProperty(exports, "__esModule", { value: true });
// functions/src/standalone.ts
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Initialize Firebase Admin with a Service Account for GitHub Actions
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}
const db = admin.firestore();
const config_1 = require("./config");
const gemini_1 = require("./gemini");
const scraper_1 = require("./scraper");
const firestore_1 = require("firebase-admin/firestore");
const crypto = __importStar(require("crypto"));
const generateLeadId = (portalId, plotNo, companyName) => {
    const raw = `${portalId}-${plotNo || "no-plot"}-${companyName || "no-name"}`;
    return crypto.createHash("md5").update(raw).digest("hex");
};
async function runScout() {
    console.log("🚀 Starting Free Standalone Scout...");
    for (const portal of config_1.PORTALS) {
        try {
            console.log(`\n--- Processing: ${portal.name} ---`);
            const targetUrl = portal.allotmentPath && portal.allotmentPath.length > 0
                ? `${portal.url}${portal.allotmentPath[0]}`
                : portal.dataUrl;
            const html = await (0, scraper_1.fetchPageContent)(targetUrl, portal.id);
            if (!html || html.length < 50) {
                console.log(`Skipping ${portal.name}: Empty content`);
                continue;
            }
            const extractedData = await (0, gemini_1.parseHtmlWithGemini)(html);
            if (!extractedData.length) {
                console.log(`No leads found for ${portal.name}`);
                continue;
            }
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
                console.log(`Enriching ${newValidLeads.length} new leads...`);
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
                console.log(`✅ Committed ${batchCount} leads for ${portal.name}`);
            }
        }
        catch (err) {
            console.error(`❌ Error in ${portal.name}:`, err);
        }
    }
}
runScout().then(() => {
    console.log("🏁 All states processed!");
    process.exit(0);
}).catch(err => {
    console.error("💥 Fatal Error:", err);
    process.exit(1);
});
