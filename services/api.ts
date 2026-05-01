
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { Lead, DecisionMaker } from '../types';

// Get the API base URL based on environment
const getApiUrl = (): string => {
    const env = import.meta.env;
    const useEmulator = env.VITE_USE_EMULATOR === 'true';
    const projectId = env.VITE_FIREBASE_PROJECT_ID || 'infrascout-ai';
    const region = env.VITE_FIREBASE_REGION || 'us-central1';

    if (useEmulator) {
        return (
            env.VITE_FUNCTIONS_EMULATOR_URL ||
            `http://127.0.0.1:5001/${projectId}/${region}`
        );
    }

    return (
        env.VITE_REACT_APP_API_URL ||
        `https://${region}-${projectId}.cloudfunctions.net`
    );
};

// Helper to call API with timeout fallback
const callApiWithFallback = async (
    endpoint: string,
    method: string = 'POST',
    data: any = {},
    timeoutMs: number = 60000
) => {
    const controller = new AbortController();

    try {
        const url = `${getApiUrl()}/${endpoint}`;
        console.log(`📡 Calling ${method} ${url}`);

        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: method !== 'GET' ? JSON.stringify(data) : undefined,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();

        let responseData: any;
        try {
            responseData = responseText ? JSON.parse(responseText) : null;
        } catch {
            responseData = responseText;
        }

        if (!response.ok) {
            throw new Error(
                responseData?.error ||
                responseData?.message ||
                `API Error ${response.status}`
            );
        }

        return responseData;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`⏱️ ${endpoint} timed out`);
            return null;
        }

        console.error(`❌ API Error (${endpoint}):`, error.message);
        return null;
    }
};

const PORTAL_STATE_MAP: Record<string, string> = {
    'AP_APIIC': 'Andhra Pradesh',
    'BR_BIADA': 'Bihar',
    'CG_CSIDC': 'Chhattisgarh',
    'GJ_GIDC': 'Gujarat',
    'HR_HSIIDC': 'Haryana',
    'KA_KIADB': 'Karnataka',
    'KL_KINFRA': 'Kerala',
    'MP_MPIDC': 'Madhya Pradesh',
    'MH_MIDC': 'Maharashtra',
    'OD_IDCO': 'Odisha',
    'PB_PSIEC': 'Punjab',
    'RJ_RIICO': 'Rajasthan',
    'TN_SIPCOT': 'Tamil Nadu',
    'TG_TGIIC': 'Telangana',
    'UP_UPSIDA': 'Uttar Pradesh',
    'WB_WBIIDC': 'West Bengal',
};

// ✅ Trigger the daily scout function
export const triggerDailyScout = async (portalId: string) => {
    console.log(`🔍 Scouting ${portalId}...`);

    try {
        const backendResult = await callApiWithFallback(
            'dailyScout',
            'POST',
            { portalId },
            180000 // 3 min for Puppeteer + Gemini
        );

        console.log('📦 Full backend response:', backendResult);

        // ❌ Backend totally failed
        if (!backendResult || backendResult.success === false) {
            const isEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';
            return {
                addedCount: 0,
                mode: 'error',
                message:
                    backendResult?.error ||
                    (isEmulator 
                        ? 'Backend failed. Check Firebase emulator terminal.' 
                        : 'Backend failed. The service might be down or misconfigured.'),
            };
        }

        // ✅ Leads found
        if (backendResult?.results?.added > 0) {
            return {
                addedCount: backendResult.results.added,
                mode: 'real',
                message: `Successfully found ${backendResult.results.added} leads`,
            };
        }

        // ⚠️ Function worked but no leads
        return {
            addedCount: 0,
            mode: 'empty',
            message:
                backendResult?.results?.errors?.length > 0
                    ? backendResult.results.errors.join(' | ')
                    : `No new leads found for ${portalId}`,
        };
    } catch (error: any) {
        console.error('❌ Error in triggerDailyScout:', error);

        return {
            addedCount: 0,
            mode: 'error',
            message: error.message || 'Unknown scout error',
        };
    }
};

// ✅ Real portal URLs mapping
const REAL_PORTAL_URLS: Record<string, string> = {
    'AP_APIIC': 'https://apiic.in',
    'BR_BIADA': 'https://biadabihar.in',
    'CG_CSIDC': 'https://csidc.in',
    'GJ_GIDC': 'https://gidc.gujarat.gov.in',
    'HR_HSIIDC': 'https://hsiidc.org.in',
    'KA_KIADB': 'https://kiadb.in',
    'KL_KINFRA': 'https://kinfra.org',
    'MP_MPIDC': 'https://invest.mp.gov.in',
    'MH_MIDC': 'https://midcindia.org',
    'OD_IDCO': 'https://idco.in',
    'PB_PSIEC': 'https://psiec.punjab.gov.in',
    'RJ_RIICO': 'https://riico.co.in',
    'TN_SIPCOT': 'https://sipcot.tn.gov.in',
    'TG_TGIIC': 'https://tgiic.telangana.gov.in',
    'UP_UPSIDA': 'https://onlineupsida.com',
    'WB_WBIIDC': 'https://wbiidc.wb.gov.in',
};

// ✅ Generate mock leads with realistic data
// const generateMockLeads = (portalId: string): Omit<Lead, 'id' | 'createdAt'>[] => {
//     const mockCompanies = [
//         'Reliance Industries Limited',
//         'Tata Steel Limited',
//         'Jindal Steel & Power Limited',
//         'Vedanta Limited',
//         'JSW Steel Limited',
//     ];

//     const mockSectors = [
//         'Steel & Metals',
//         'Pharmaceuticals',
//         'Electronics Manufacturing',
//         'Textiles & Apparel',
//         'Logistics & Warehousing',
//     ];

//     const realPortalUrl = REAL_PORTAL_URLS[portalId] || `https://${portalId.toLowerCase()}.gov.in`;

//     const leads: Omit<Lead, 'id' | 'createdAt'>[] = [];

//     for (let i = 0; i < 3; i++) {
//         const company = mockCompanies[i % mockCompanies.length];
//         const sector = mockSectors[i % mockSectors.length];

//         leads.push({
//             companyName: `${company} - Unit ${i + 1}`,
//             plotNo: `PLOT-${String(i + 1).padStart(3, '0')}-${portalId}`,
//             acreage: 5 + i * 2,
//             date: new Date().toISOString().split('T')[0],
//             portalId: portalId,
//             sourceUrl: `${realPortalUrl}/industrial-allotments`,
//             sector: sector,
//             website: `https://${company.replace(/\s/g, '').toLowerCase()}.com`,
//             contactEmail: `contact@${company.replace(/\s/g, '').toLowerCase()}.com`,
//             contactPhone: '+91-XXXXX-XXXXX',
//             summary: `Industrial facility specializing in ${sector} in ${PORTAL_STATE_MAP[portalId] || portalId}`,
//             status: 'new',
//             decisionMakers: [],
//         });
//     }

//     return leads;
// };

// ⚠️ DEPRECATED: Use real backend instead
// const generateMockDecisionMakers = (companyName: string): DecisionMaker[] => {
//     return [];
// };

// ✅ Draft a cold email for a lead
export const draftColdEmail = async (lead: Lead): Promise<{ subject: string; body: string }> => {
    const company = lead.companyName || 'Company';
    console.log(`✉️ Drafting email for ${company}...`);

    try {
        const backendResult = await callApiWithFallback('draftEmail', 'POST', {
            lead: {
                companyName: company,
                sector: lead.sector || 'Industrial',
                plotNo: lead.plotNo || 'allocated plot',
            },
        }, 30000);

        if (backendResult?.subject && backendResult?.body) {
            console.log('✅ Email drafted by backend');
            return backendResult;
        }

        return generateEmailDraftLocal(lead);
    } catch (error) {
        console.error('Error drafting email:', error);
        return generateEmailDraftLocal(lead);
    }
};

// ✅ Local email draft generation
const generateEmailDraftLocal = (lead: Lead) => {
    const company = lead.companyName || 'Company';
    const sector = lead.sector || 'industrial';

    return {
        subject: `Strategic Partnership Opportunity - ${company}`,
        body: `Dear ${company} Leadership,

We've identified an excellent industrial facility opportunity in ${PORTAL_STATE_MAP[lead.portalId] || lead.portalId} that aligns with your expansion plans:

📍 Location: ${PORTAL_STATE_MAP[lead.portalId] || lead.portalId}
📊 Sector: ${sector}
📐 Plot Size: ${lead.acreage} acres
🏢 Reference: ${lead.plotNo}

This property presents significant potential for your ${sector} operations, with excellent infrastructure and logistics connectivity.

Would you be available for a brief call this week to discuss this opportunity in detail?

Best regards,
Nadendla AI Team`
    };
};

// ✅ Deep research for decision makers
export const deepResearchLead = async (lead: Lead): Promise<DecisionMaker[]> => {
    const company = lead.companyName || 'Company';
    console.log(`🔎 Deep researching ${company}...`);

    // Check if already has decision makers
    if (lead.decisionMakers && lead.decisionMakers.length > 0) {
        console.log(`✅ Decision makers already found: ${lead.decisionMakers.length}`);
        return lead.decisionMakers;
    }

    try {
        const backendResult = await callApiWithFallback('deepResearch', 'POST', {
            leadId: lead.id,
            companyName: company,
            portalName: lead.portalId,
        }, 60000);

        if (backendResult?.decisionMakers && Array.isArray(backendResult.decisionMakers) && backendResult.decisionMakers.length > 0) {
            console.log(`✅ Found ${backendResult.decisionMakers.length} real decision makers`);

            // Update Firestore with decision makers
            if (lead.id) {
                try {
                    await updateDoc(doc(db, 'leads', lead.id), {
                        decisionMakers: backendResult.decisionMakers,
                        status: 'researched',
                    });
                } catch (updateError) {
                    console.warn('Could not update lead with decision makers:', updateError);
                }
            }

            return backendResult.decisionMakers;
        }

        // No fallback to mock data in production
        console.log('⚠️ No decision makers found for this company');
        return [];
    } catch (error) {
        console.error('Error in deep research:', error);
        return [];
    }
};

// ✅ Fetch leads for a specific portal
export const fetchLeadsForPortal = async (portalId: string): Promise<Lead[]> => {
    try {
        const leadsRef = collection(db, 'leads');
        const q = query(leadsRef, where('portalId', '==', portalId));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                companyName: data.companyName || null,
                plotNo: data.plotNo || null,
                acreage: data.acreage || null,
                date: data.date || null,
                portalId: data.portalId || portalId,
                sourceUrl: data.sourceUrl || '',
                sector: data.sector || null,
                website: data.website || null,
                contactEmail: data.contactEmail || null,
                contactPhone: data.contactPhone || null,
                summary: data.summary || null,
                status: data.status || 'new',
                decisionMakers: data.decisionMakers || [],
                createdAt: data.createdAt || Timestamp.now(),
            } as Lead;
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
    }
};

// ✅ Save a lead to Firestore
export const saveLead = async (lead: Omit<Lead, 'id' | 'createdAt'>): Promise<string | null> => {
    try {
        const docRef = await addDoc(collection(db, 'leads'), {
            ...lead,
            createdAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving lead:', error);
        return null;
    }
};

// ✅ Update lead status
export const updateLeadStatus = async (leadId: string, status: 'new' | 'viewed' | 'researched' | 'contacted'): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'leads', leadId), { status });
        return true;
    } catch (error) {
        console.error('Error updating lead status:', error);
        return false;
    }
};

// ✅ Add decision makers to a lead
export const addDecisionMakersToLead = async (leadId: string, decisionMakers: DecisionMaker[]): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'leads', leadId), {
            decisionMakers,
            status: 'researched',
        });
        return true;
    } catch (error) {
        console.error('Error adding decision makers:', error);
        return false;
    }
};

// (Seed and clear functions removed — production only uses real scraped data)
