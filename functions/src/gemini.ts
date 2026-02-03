import { GoogleGenerativeAI } from "@google/generative-ai";
import * as functions from "firebase-functions";

// Initialize Gemini Client
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    try {
        apiKey = functions.config()?.gemini?.key;
    } catch (e) {
        console.warn("Could not get Gemini key from functions.config()");
    }
}

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not set");
}

// Initialize Generative API Key (fallback)
let generativeApiKey = process.env.GENERATIVE_API_KEY;

if (!generativeApiKey) {
    try {
        generativeApiKey = functions.config()?.generative?.key;
    } catch (e) {
        console.warn("Could not get Generative API key from functions.config()");
    }
}

const ai = new GoogleGenerativeAI(apiKey || generativeApiKey || "");

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
    contact?: string;
    email?: string;
}

export const parseHtmlWithGemini = async (htmlContent: string): Promise<ExtractedLead[]> => {
    if (!htmlContent || htmlContent.length < 50) return [];

    const truncatedHtml = htmlContent.substring(0, 50000);

    try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const response = await model.generateContent(`Extract industrial land allotments from this HTML.

Return ONLY a JSON array:
[{"CompanyName": "name or null", "PlotNo": "plot or null", "Acreage": number or null, "Date": "YYYY-MM-DD or null"}]

Rules: Industrial only, ignore residential/repairs, convert dates properly, use null if unclear.

HTML:\n${truncatedHtml}`);

        const text = response.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Parse Error:", error);
        return [];
    }
};

export const enrichLeadWithGemini = async (companyName: string, portalName: string): Promise<EnrichedData> => {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const response = await model.generateContent(`Company: "${companyName}" got industrial land in ${portalName}, India.

TASK: Identify the SINGLE MOST LIKELY industry sector.

Options: Manufacturing, Technology, Pharmaceuticals, Automotive, Electronics, Textiles, Logistics, Metals & Steel, Chemicals, Food Processing, Renewable Energy, Infrastructure, Defence, Agriculture, Other

Return ONLY the sector name (one word or compound, e.g., "Steel & Metals"). Do not add explanation.`);

        const sector = response.response.text().trim() || "Manufacturing";

        // Additional research for contact info (optional)
        let website = null;
        let email = null;
        let phone = null;

        try {
            const contactResponse = await model.generateContent(`For company "${companyName}", provide:
1. Official website URL (or null)
2. Main contact email (or null)  
3. Main phone (or null)

Format: website|email|phone (use "null" for unknown)`);

            const contactText = contactResponse.response.text().trim();
            const parts = contactText.split('|');

            website = parts[0]?.toLowerCase().includes('null') ? null : parts[0]?.trim() || null;
            email = parts[1]?.toLowerCase().includes('null') ? null : parts[1]?.trim() || null;
            phone = parts[2]?.toLowerCase().includes('null') ? null : parts[2]?.trim() || null;
        } catch (e) {
            console.warn("Could not fetch contact info:", e);
        }

        return {
            sector,
            website,
            email,
            phone,
            summary: `${sector} facility in ${portalName}`
        };
    } catch (error) {
        console.error("Enrichment Error:", error);
        return {
            sector: "Manufacturing",
            website: null,
            email: null,
            phone: null,
            summary: `Industrial facility in ${portalName}`
        };
    }
};

export const generateEmailDraft = async (companyName: string, plotNo: string, sector: string): Promise<{ subject: string; body: string }> => {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const response = await model.generateContent(`Write a professional cold email to ${companyName} about their new ${sector} facility at plot ${plotNo} in India.

Requirements:
- Subject line: Max 60 characters, professional
- Body: 3-4 short paragraphs, value-focused
- Mention industrial expansion opportunity
- Include call-to-action
- Professional but not sales-y

Return ONLY valid JSON:
{
  "subject": "subject line here",
  "body": "email body here"
}`);

        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const draft = JSON.parse(jsonMatch[0]);

            if (draft.subject && draft.body) {
                console.log(`✅ Email draft generated for ${companyName}`);
                return draft;
            }
        }
    } catch (error) {
        console.error("Email Draft Error:", error);
    }

    // Fallback template
    return {
        subject: `Strategic Opportunity - ${companyName}'s New Facility`,
        body: `Dear ${companyName} Leadership,

We noted your recent acquisition of industrial land at ${plotNo}. Congratulations on this strategic expansion!

We specialize in supporting ${sector} companies during facility commissioning. Our services include infrastructure planning, regulatory support, and operational setup.

Would you have 15 minutes next week for a brief discussion?

Best regards,
InfraScout AI`
    };
};

export const deepResearchWithGemini = async (companyName: string): Promise<DecisionMaker[]> => {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const response = await model.generateContent(`Find 3-5 decision makers at "${companyName}" who make real estate and facility expansion decisions.

Return JSON array with exact this format:
[
  {"name": "Full Name", "role": "Position Title", "email": "email@company.com or null", "contact": "+91-XXXXXXXXXX or null"},
  {"name": "Another Person", "role": "Another Role", "email": "email@company.com or null", "contact": "+91-XXXXXXXXXX or null"}
]

Rules:
- Only return data if you have HIGH confidence
- Include Managing Director, Operations Head, Project Director, or CFO
- If email/contact unknown, use null (do NOT guess)
- Return minimum 1, maximum 5 people
- Return [] if company not found or data unreliable

Company: ${companyName}`);

        const text = response.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const makers = JSON.parse(jsonMatch[0]);

            // Validate response format
            if (Array.isArray(makers) && makers.length > 0) {
                const validated = makers.filter(m => m.name && m.role);

                if (validated.length > 0) {
                    console.log(`✅ Found ${validated.length} decision makers for ${companyName}`);
                    return validated;
                }
            }
        }

        console.log(`⚠️ No valid decision makers found for ${companyName}`);
        return [];
    } catch (error) {
        console.error("Research Error:", error);
        return [];
    }
};
