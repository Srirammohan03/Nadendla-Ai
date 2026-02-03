"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENRICHMENT_SYSTEM_PROMPT = exports.PARSING_SYSTEM_PROMPT = exports.PORTALS = void 0;
exports.PORTALS = [
    { id: 'AP_APIIC', name: 'Andhra Pradesh (APIIC)', url: 'https://apiic.in' },
    { id: 'BR_BIADA', name: 'Bihar (BIADA)', url: 'https://biadabihar.in' },
    { id: 'CG_CSIDC', name: 'Chhattisgarh (CSIDC)', url: 'https://csidc.in' },
    { id: 'GJ_GIDC', name: 'Gujarat (GIDC)', url: 'https://gidc.gujarat.gov.in' },
    { id: 'HR_HSIIDC', name: 'Haryana (HSIIDC)', url: 'https://hsiidc.org.in' },
    { id: 'KA_KIADB', name: 'Karnataka (KIADB)', url: 'https://kiadb.in' },
    { id: 'KL_KINFRA', name: 'Kerala (KINFRA)', url: 'https://kinfra.org' },
    { id: 'MP_MPIDC', name: 'Madhya Pradesh (MPIDC)', url: 'https://invest.mp.gov.in' },
    { id: 'MH_MIDC', name: 'Maharashtra (MIDC)', url: 'https://midcindia.org' },
    { id: 'OD_IDCO', name: 'Odisha (IDCO)', url: 'https://idco.in' },
    { id: 'PB_PSIEC', name: 'Punjab (PSIEC)', url: 'https://psiec.punjab.gov.in' },
    { id: 'RJ_RIICO', name: 'Rajasthan (RIICO)', url: 'https://riico.co.in' },
    { id: 'TN_SIPCOT', name: 'Tamil Nadu (SIPCOT)', url: 'https://sipcot.tn.gov.in' },
    { id: 'TG_TGIIC', name: 'Telangana (TGIIC)', url: 'https://tgiic.telangana.gov.in' },
    { id: 'UP_UPSIDA', name: 'Uttar Pradesh (UPSIDA)', url: 'https://onlineupsida.com' },
    { id: 'WB_WBIIDC', name: 'West Bengal (WBIIDC)', url: 'https://wbiidc.wb.gov.in' }
];
// System Prompt for Parsing HTML
exports.PARSING_SYSTEM_PROMPT = `
  You are a precise data extraction engine. Analyze this HTML. Extract a list of **industrial land allotments** into a JSON array.
  
  Output Format (JSON Array of Objects):
  - CompanyName (string)
  - PlotNo (string)
  - Acreage (number, acres)
  - Date (string, ISO 8601 format YYYY-MM-DD)
  
  Rules:
  1. Only include industrial/commercial land allotments.
  2. Ignore residential, repairs, road works, fence repairs, maintenance.
  3. If a field is unclear, set to null.
  4. If no valid data found, return [].
  5. Never hallucinate.
  
  Return ONLY the raw JSON. No markdown code blocks.
  `;
exports.ENRICHMENT_SYSTEM_PROMPT = `
  You are an industry classification engine. Given a company name, guess its industry sector (e.g., Pharma, Logistics, Automotive, Textiles, Food Processing, Electronics, Steel & Metals).
  Respond with a single short string (sector name only).
  If unsure, respond: Unknown.
  `;
