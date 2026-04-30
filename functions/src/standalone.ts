// functions/src/standalone.ts
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();

// Initialize Firebase Admin with a Service Account for GitHub Actions
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

import { PORTALS } from "./config";
import { 
  parseHtmlWithGemini, 
  bulkDeepResearchWithGemini,
  ExtractedLead 
} from "./gemini";
import { fetchPageContent } from "./scraper";
import { Timestamp } from "firebase-admin/firestore";
import * as crypto from "crypto";

const generateLeadId = (
  portalId: string,
  plotNo: string | null,
  companyName: string | null
): string => {
  const raw = `${portalId}-${plotNo || "no-plot"}-${companyName || "no-name"}`;
  return crypto.createHash("md5").update(raw).digest("hex");
};

async function runScout() {
    console.log("🚀 Starting Free Standalone Scout...");
    
    for (const portal of PORTALS) {
        try {
            console.log(`\n--- Processing: ${portal.name} ---`);
            const targetUrl = portal.allotmentPath && portal.allotmentPath.length > 0 
                ? `${portal.url}${portal.allotmentPath[0]}` 
                : portal.dataUrl;

            const html = await fetchPageContent(targetUrl, portal.id);
            if (!html || html.length < 50) {
                console.log(`Skipping ${portal.name}: Empty content`);
                continue;
            }

            const extractedData = await parseHtmlWithGemini(html);
            if (!extractedData.length) {
                console.log(`No leads found for ${portal.name}`);
                continue;
            }

            const batch = db.batch();
            let batchCount = 0;
            const newValidLeads: Array<{ item: ExtractedLead, leadId: string }> = [];

            for (const item of extractedData) {
                if (!item.CompanyName && !item.PlotNo) continue;
                const leadId = generateLeadId(portal.id, item.PlotNo, item.CompanyName);
                const leadRef = db.collection("leads").doc(leadId);
                const existingDoc = await leadRef.get();
                if (existingDoc.exists) continue;
                newValidLeads.push({ item, leadId });
            }

            if (newValidLeads.length > 0) {
                console.log(`Enriching ${newValidLeads.length} new leads...`);
                const companyNames = newValidLeads.map(nl => nl.item.CompanyName).filter(Boolean) as string[];
                const bulkData = await bulkDeepResearchWithGemini(companyNames, portal.name);

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
                        createdAt: Timestamp.fromDate(new Date()),
                        updatedAt: Timestamp.fromDate(new Date()),
                        lastResearched: Timestamp.fromDate(new Date()),
                    });
                    batchCount++;
                }
                await batch.commit();
                console.log(`✅ Committed ${batchCount} leads for ${portal.name}`);
            }
        } catch (err) {
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
