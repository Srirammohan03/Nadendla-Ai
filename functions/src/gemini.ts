// functions/src/gemini.ts
import * as dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as functions from "firebase-functions";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// ======================================================
// GEMINI API KEY LOADING (Production Safe)
// ======================================================
let apiKey = process.env.GEMINI_API_KEY;

const finalApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GENERATIVE_API_KEY;
if (!finalApiKey) {
    throw new Error("❌ CRITICAL: No Gemini API key available");
}

console.log("Gemini Key Exists:", finalApiKey ? "YES" : "NO");


// ======================================================
// MODEL CONFIG
// ======================================================
// For v1beta API (older projects), use: gemini-1.5-flash
// For v1 API (newer projects), use: gemini-1.5-flash-flash
// Modern Google AI Studio API
const ai = new GoogleGenerativeAI(finalApiKey);

// ======================================================
// MODEL CONFIG
// ======================================================
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

console.log(`🚀 Using Gemini Model: ${MODEL_NAME}`);

const getModel = (systemInstruction?: string) =>
    ai.getGenerativeModel({
        model: MODEL_NAME,
        ...(systemInstruction
            ? {
                systemInstruction,
            }
            : {}),
    });


// =====================================================
// WHY:
// Your installed @google/generative-ai version does NOT support:
// responseMimeType
//
// That feature exists only in newer SDK versions.
// Your current firebase/functions stack is older.
//
// So use prompt-enforced JSON instead.
// =====================================================

// ======================================================
// TYPES
// ======================================================
export interface ExtractedLead {
    CompanyName: string | null;
    PlotNo: string | null;
    Acreage: number | null;
    Date: string | null;
}

export interface EnrichedData {
    sector: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    summary: string | null;
}

export interface DecisionMaker {
    name: string;
    role: string;
    contact?: string | null;
    email?: string | null;
}

// ======================================================
// HELPERS
// ======================================================
const cleanHtmlForAi = (html: string): string => {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
        .replace(/\s+/g, " ")
        .trim(); // No more substring limit! Let Gemini read the whole page.
};

const safeJsonParse = <T>(text: string, fallback: T): T => {
    try {
        const cleaned = text
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);
    } catch {
        return fallback;
    }
};

const extractJsonArray = (text: string): string | null => {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? match[0] : null;
};

const extractJsonObject = (text: string): string | null => {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
};

// ======================================================
// PARSE HTML FOR LAND LEADS
// ======================================================
export const parseHtmlWithGemini = async (
    htmlContent: string
): Promise<ExtractedLead[]> => {
    if (!htmlContent || htmlContent.length < 50) return [];

    const cleanedHtml = cleanHtmlForAi(htmlContent);

    try {
        const model = getModel(`
You are an industrial land allotment extraction engine.

Extract ALL valid industrial/commercial land allotment records.

IGNORE:
- Header/footer/navigation
- Menus
- Scripts
- Residential
- Irrelevant tenders
- Empty rows

RETURN ONLY:
A valid JSON array.

FORMAT:
[
  {
    "CompanyName": "string",
    "PlotNo": "string",
    "Acreage": number,
    "Date": "YYYY-MM-DD"
  }
]

RULES:
- Convert sq meters to acres if possible
- Null if unavailable
- No markdown
- No explanation
- Return [] if none
`);

        console.log("📤 Sending HTML to Gemini...");
        console.log(`📄 HTML Payload Length: ${cleanedHtml.length}`);



        // 🔥 THE STUBBORN AUTO-RETRY LOOP 🔥
        let rawText = "";
        let retries = 5; // Increased to 5 attempts

        while (retries > 0) {
            try {
                const result = await model.generateContent(cleanedHtml); // (Use 'prompt' for the enrich function)
                rawText = result.response.text();
                break; // Success! Break out of the loop.
            } catch (error: any) {
                if (error.status === 503 && retries > 1) {
                    console.log(`⚠️ Google API overloaded (503). Retrying in 15 seconds... (${retries - 1} attempts left)`);
                    await delay(15000); // Increased wait to 15 seconds to let the traffic clear
                    retries--;
                } else {
                    throw error;
                }
            }
        }

        console.log(`📥 Gemini Response Length: ${rawText.length}`);
        // const rawText = result.response.text();


        const jsonArray = extractJsonArray(rawText);

        if (!jsonArray) {
            console.log("⚠️ No valid JSON array found");
            return [];
        }

        const parsed = safeJsonParse<any[]>(jsonArray, []);

        if (!Array.isArray(parsed)) return [];

        const validated: ExtractedLead[] = parsed
            .filter(
                (lead) =>
                    lead &&
                    (lead.CompanyName || lead.PlotNo)
            )
            .map((lead) => ({
                CompanyName: lead.CompanyName || null,
                PlotNo: lead.PlotNo || null,
                Acreage:
                    typeof lead.Acreage === "number"
                        ? lead.Acreage
                        : lead.Acreage
                            ? Number(lead.Acreage)
                            : null,
                Date: lead.Date || null,
            }));

        console.log(`✅ Parsed ${validated.length} leads`);

        return validated;
    } catch (error) {
        console.error("❌ Parse Error:", error);
        return [];
    }
};

// ======================================================
// ENRICH COMPANY
// ======================================================
export const enrichLeadWithGemini = async (
    companyName: string,
    portalName: string
): Promise<EnrichedData> => {
    // If we don't have a company name, return a safe default immediately
    if (!companyName || companyName === "") {
        return {
            sector: "Manufacturing",
            website: null,
            email: null,
            phone: null,
            summary: `Industrial facility in ${portalName}`,
        };
    }

    try {
        const model = getModel(`
You are a business sector classifier.
Return ONLY JSON:
{
  "sector": "string",
  "summary": "string"
}
Allowed sectors:
Manufacturing, Technology, Pharmaceuticals, Automotive, Electronics, Textiles, Logistics, Metals & Steel, Chemicals, Food Processing, Renewable Energy, Infrastructure, Defence, Agriculture, Other
`);

        const prompt = `Company: ${companyName}\nPortal: ${portalName}`;

        // 🔥 THE STUBBORN AUTO-RETRY LOOP 🔥
        let rawText = "";
        let retries = 5;

        while (retries > 0) {
            try {
                // Notice we are passing 'prompt' here, NOT 'cleanedHtml'
                const result = await model.generateContent(prompt);
                rawText = result.response.text();
                break; // Success! Break out of the loop.
            } catch (error: any) {
                if (error.status === 503 && retries > 1) {
                    console.log(`⚠️ Enrichment API overloaded (503). Retrying in 15 seconds... (${retries - 1} left)`);
                    await delay(15000);
                    retries--;
                } else {
                    throw error;
                }
            }
        }

        const parsed = safeJsonParse<any>(rawText, {});

        return {
            sector: parsed.sector || "Manufacturing",
            website: null,
            email: null,
            phone: null,
            summary:
                parsed.summary ||
                `${parsed.sector || "Industrial"} facility in ${portalName}`,
        };
    } catch (error) {
        console.error("❌ Enrichment Error:", error);

        // Fallback default so the app never crashes
        return {
            sector: "Manufacturing",
            website: null,
            email: null,
            phone: null,
            summary: `Industrial facility in ${portalName}`,
        };
    }
};

// ======================================================
// EMAIL DRAFT
// ======================================================
export const generateEmailDraft = async (
    companyName: string,
    plotNo: string,
    sector: string
): Promise<{ subject: string; body: string }> => {
    try {
        const model = getModel(`
You are a professional B2B industrial outreach writer.

Return ONLY JSON:
{
  "subject": "string",
  "body": "string"
}
`);

        const result = await model.generateContent(`
Company: ${companyName}
Plot: ${plotNo}
Sector: ${sector}
`);

        const jsonObject = extractJsonObject(result.response.text());

        if (!jsonObject) {
            throw new Error("No valid JSON object");
        }

        const parsed = safeJsonParse<any>(jsonObject, null);

        if (parsed?.subject && parsed?.body) {
            return parsed;
        }

        throw new Error("Invalid draft");
    } catch (error) {
        console.error("❌ Email Draft Error:", error);

        return {
            subject: `Strategic Opportunity - ${companyName}`,
            body: `Dear ${companyName},

We noticed your recent industrial land allocation at ${plotNo}.

We help ${sector} businesses accelerate expansion through infrastructure, vendor intelligence, and operational support.

Would you be open to a quick discussion?

Best regards,
InfraScout AI`,
        };
    }
};

// ======================================================
// DECISION MAKERS
// ======================================================
export const deepResearchWithGemini = async (
    companyName: string
): Promise<DecisionMaker[]> => {
    try {
        const model = getModel(`
You are a B2B company research assistant.

Return ONLY JSON array:
[
  {
    "name": "string",
    "role": "string",
    "email": "string|null",
    "contact": "string|null"
  }
]

Return [] if unavailable.
`);

        const result = await model.generateContent(
            `Find likely senior decision makers for ${companyName}`
        );

        const jsonArray = extractJsonArray(result.response.text());

        if (!jsonArray) return [];

        const parsed = safeJsonParse<any[]>(jsonArray, []);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (person) => person?.name && person?.role
        );
    } catch (error) {
        console.error("❌ Research Error:", error);
        return [];
    }
};