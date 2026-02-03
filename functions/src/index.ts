import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import * as crypto from "crypto";

import { PORTALS } from "./config";
import { parseHtmlWithGemini, enrichLeadWithGemini, generateEmailDraft, deepResearchWithGemini, ExtractedLead } from "./gemini";
// Import the new robust scraper
import { fetchPageContent } from "./scraper";
import { generateDummyLeads, clearDemoData } from "./seedData";

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

// --- Helper Functions ---

// 2. Deduplication Key Generator
const generateLeadId = (portalId: string, plotNo: string | null, companyName: string | null): string => {
  const raw = `${portalId}-${plotNo || 'no-plot'}-${companyName || 'no-name'}`;
  return crypto.createHash('md5').update(raw).digest('hex');
};

// --- Cloud Functions ---

// The Main Scout Engine
// IMPORTANT: Puppeteer requires more memory (2GB) and longer timeout
export const dailyScout = functions
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
        ? PORTALS.filter(p => p.id === targetPortalId)
        : PORTALS;

      const results = {
        mode: targetPortalId ? `Single State: ${targetPortalId}` : 'All States',
        scanned: 0,
        parsed: 0,
        added: 0,
        errors: [] as string[]
      };

      try {
        console.log(`Starting Scout routine. Mode: ${results.mode}`);

        // Iterate over Configured Portals
        for (const portal of portalsToProcess) {
          console.log(`\n--- Processing: ${portal.name} ---`);

          // 1. Fetch using Robust Scraper (Puppeteer)
          const html = await fetchPageContent(portal.url);
          if (!html) {
            const msg = `Skipping ${portal.name}: Fetch returned empty/null.`;
            console.warn(msg);
            results.errors.push(msg);
            continue;
          }

          results.scanned++;

          // 2. AI Parsing
          let extractedData: ExtractedLead[] = [];
          try {
            extractedData = await parseHtmlWithGemini(html);
          } catch (parseError: any) {
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
            if (!item.CompanyName && !item.PlotNo) continue;

            const leadId = generateLeadId(portal.id, item.PlotNo, item.CompanyName);
            const leadRef = db.collection('leads').doc(leadId);

            // Deduplication Check
            const doc = await leadRef.get();
            if (doc.exists) {
              continue;
            }

            // Enrichment (Sector + Contact Discovery via Google Search)
            console.log(`Deep searching for: ${item.CompanyName}...`);
            const enriched = await enrichLeadWithGemini(item.CompanyName || '', portal.name);

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
              summary: enriched.summary, // Added summary
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

      } catch (error: any) {
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
export const draftEmail = functions.https.onRequest((req, res) => {
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
      const draft = await generateEmailDraft(
        lead.companyName,
        lead.plotNo || "allocated plot",
        lead.sector || "Infrastructure"
      );

      res.json({
        success: true,
        subject: draft.subject,
        body: draft.body,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
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
export const deepResearch = functions.https.onRequest((req, res) => {
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
      const decisionMakers = await deepResearchWithGemini(companyName);

      // Update Firestore if leadId provided
      if (leadId) {
        try {
          await db.collection('leads').doc(leadId).update({
            decisionMakers: decisionMakers,
            lastResearched: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (updateError) {
          console.warn("Could not update Firestore:", updateError);
        }
      }

      res.json({
        success: true,
        decisionMakers: decisionMakers,
        count: decisionMakers.length,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
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
export const seedDummyData = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const result = await generateDummyLeads();
      return res.status(200).json({
        success: result.success,
        count: result.count,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
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
export const clearDemoDataFunction = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const result = await clearDemoData();
      return res.status(200).json({
        success: result.success,
        count: result.count,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
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