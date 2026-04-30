// functions/src/index.ts
import * as dotenv from "dotenv";
dotenv.config();

console.log("Gemini Key Exists:", process.env.GEMINI_API_KEY ? "YES" : "NO");

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import cors from "cors";
import * as crypto from "crypto";

import { PORTALS } from "./config";
import {
  parseHtmlWithGemini,
  generateEmailDraft,
  deepResearchWithGemini,
  bulkDeepResearchWithGemini,
  ExtractedLead,
} from "./gemini";

import { fetchPageContent } from "./scraper";

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
const corsHandler = cors({
  origin: true,
  credentials: true,
});

// ======================================================
// HELPERS
// ======================================================
const generateLeadId = (
  portalId: string,
  plotNo: string | null,
  companyName: string | null
): string => {
  const raw = `${portalId}-${plotNo || "no-plot"}-${companyName || "no-name"}`;
  return crypto.createHash("md5").update(raw).digest("hex");
};

const handleOptions = (req: functions.https.Request, res: functions.Response): boolean => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
};

// ======================================================
// DAILY SCOUT
// ======================================================
export const dailyScout = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
      if (handleOptions(req, res)) return;

      try {
        const targetPortalId = req.body?.portalId;

        const portalsToProcess = targetPortalId
          ? PORTALS.filter((p) => p.id === targetPortalId)
          : PORTALS;

        const results = {
          mode: targetPortalId ? `Single State: ${targetPortalId}` : "All States",
          scanned: 0,
          parsed: 0,
          added: 0,
          errors: [] as string[],
        };

        console.log(`🚀 Starting Scout routine. Mode: ${results.mode}`);

        for (const portal of portalsToProcess) {
          try {
            console.log(`\n--- Processing: ${portal.name} ---`);

            const targetUrl = portal.allotmentPath && portal.allotmentPath.length > 0
              ? `${portal.url}${portal.allotmentPath[0]}`
              : portal.dataUrl;

            console.log(`🎯 Target URL for ${portal.name}: ${targetUrl}`);

            const html = await fetchPageContent(targetUrl, portal.id);

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

            let extractedData: ExtractedLead[] = [];

            try {
              extractedData = await parseHtmlWithGemini(dataToParse);

              console.log(`🧠 Extracted leads for ${portal.name}:`, extractedData);
              console.log(`📊 Total extracted count: ${extractedData.length}`);
            } catch (parseError: any) {
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
            const newValidLeads: Array<{ item: ExtractedLead, leadId: string }> = [];

            for (const item of extractedData) {
              try {
                if (!item.CompanyName && !item.PlotNo) continue;

                const leadId = generateLeadId(
                  portal.id,
                  item.PlotNo,
                  item.CompanyName
                );

                const leadRef = db.collection("leads").doc(leadId);
                const existingDoc = await leadRef.get();

                if (existingDoc.exists) {
                  console.log(`⏩ Duplicate skipped: ${item.CompanyName}`);
                  continue;
                }
                
                newValidLeads.push({ item, leadId });
              } catch (leadCheckError) {
                  console.error("Error checking existing lead", leadCheckError);
              }
            }

            if (newValidLeads.length > 0) {
              console.log(`🔍 Bulk Enriching ${newValidLeads.length} leads for ${portal.name}...`);
              
              const companyNames = newValidLeads
                .map(nl => nl.item.CompanyName)
                .filter(Boolean) as string[];

              // Bulk fetch both Enrichment AND Decision Makers in 1 API call!
              const bulkData = await bulkDeepResearchWithGemini(companyNames, portal.name);

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
                  createdAt: Timestamp.fromDate(new Date()),
                  updatedAt: Timestamp.fromDate(new Date()),
                  lastResearched: Timestamp.fromDate(new Date()),
                };

                batch.set(leadRef, leadPayload);
                batchCount++;
                results.added++;
              }
              
              await batch.commit();
              console.log(
                `✅ Successfully committed ${batchCount} new leads for ${portal.name}`
              );
            } else {
              console.log(`⚠️ No new leads to commit for ${portal.name}`);
            }
          } catch (portalError: any) {
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
      } catch (error: any) {
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
export const autoScoutSchedule = functions.pubsub
  .schedule('0 0 */15 * *') // Runs at midnight every 15 days
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
      console.log("⏰ Starting 15-day auto-scout schedule...");
      
      for (const portal of PORTALS) {
        try {
          const targetUrl = portal.allotmentPath && portal.allotmentPath.length > 0 
            ? `${portal.url}${portal.allotmentPath[0]}` 
            : portal.dataUrl;

          const html = await fetchPageContent(targetUrl, portal.id);
          if (!html || html.length < 50) continue;

          const extractedData = await parseHtmlWithGemini(html);
          if (!extractedData.length) continue;

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
            console.log(`✅ Auto-scout committed ${batchCount} leads for ${portal.name}`);
          }
        } catch (error) {
          console.error(`❌ Auto-scout failed for ${portal.name}:`, error);
        }
      }
      return null;
  });

// ======================================================
// DRAFT EMAIL
// ======================================================
export const draftEmail = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (handleOptions(req, res)) return;

    try {
      const { lead } = req.body;

      if (!lead?.companyName) {
        return res.status(400).json({
          success: false,
          error: "Invalid lead data - companyName required",
          timestamp: new Date().toISOString(),
        });
      }

      const draft = await generateEmailDraft(
        lead.companyName,
        lead.plotNo || "allocated plot",
        lead.sector || "Infrastructure"
      );

      return res.status(200).json({
        success: true,
        subject: draft.subject,
        body: draft.body,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
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
export const deepResearch = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (handleOptions(req, res)) return;

    try {
      const { leadId, companyName } = req.body;

      if (!companyName) {
        return res.status(400).json({
          success: false,
          error: "Missing company name",
          timestamp: new Date().toISOString(),
        });
      }

      const decisionMakers = await deepResearchWithGemini(companyName);

      if (leadId) {
        await db.collection("leads").doc(leadId).update({
          decisionMakers,
          lastResearched: Timestamp.fromDate(new Date()),
        });
      }

      return res.status(200).json({
        success: true,
        decisionMakers,
        count: decisionMakers.length,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
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