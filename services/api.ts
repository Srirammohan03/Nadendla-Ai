import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { Lead, DecisionMaker } from '../types';

// Get the API base URL based on environment
const getApiUrl = () => {
    const useEmulator = (import.meta as any).env.VITE_USE_EMULATOR === 'true';
    if (useEmulator) {
        return (import.meta as any).env.VITE_FUNCTIONS_EMULATOR_URL || 'http://127.0.0.1:5001/infrascout-ai/us-central1';
    }
    return (import.meta as any).env.VITE_FUNCTIONS_URL || 'https://us-central1-infrascout-ai.cloudfunctions.net';
};

// Helper to call API with timeout fallback
const callApiWithFallback = async (
    endpoint: string,
    method: string = 'POST',
    data: any = {},
    timeoutMs: number = 5000
) => {
    try {
        const url = `${getApiUrl()}/${endpoint}`;
        console.log(`📡 Calling ${method} ${url}`);

        // Create abort signal with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error: any) {
        console.warn(`⚠️ API Error (${endpoint}): ${error.message}`);
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
        // Try real backend first (longer timeout for Puppeteer/Gemini)
        const backendResult = await callApiWithFallback('dailyScout', 'POST', {
            portalId,
        }, 120000); // 2 minutes for real backend

        if (backendResult?.results && backendResult.results.added > 0) {
            console.log(`✅ Found ${backendResult.results.added} real leads from backend`);
            return {
                addedCount: backendResult.results.added,
                mode: 'real',
                message: `Successfully found ${backendResult.results.added} leads`
            };
        }

        // Fallback to mock data
        console.log('📊 Falling back to mock data...');
        const mockLeads = generateMockLeads(portalId);

        // Add mock leads to Firestore
        for (const lead of mockLeads) {
            await addDoc(collection(db, 'leads'), {
                ...lead,
                createdAt: Timestamp.now(),
                isDemoData: true,
                decisionMakers: generateMockDecisionMakers(lead.companyName || 'Company'),
            });
        }

        return {
            addedCount: mockLeads.length,
            mode: 'mock',
            message: `Generated ${mockLeads.length} demo leads`
        };
    } catch (error) {
        console.error('Error in triggerDailyScout:', error);

        // Ultimate fallback - still add mock data
        const mockLeads = generateMockLeads(portalId);
        for (const lead of mockLeads) {
            await addDoc(collection(db, 'leads'), {
                ...lead,
                createdAt: Timestamp.now(),
                isDemoData: true,
                decisionMakers: generateMockDecisionMakers(lead.companyName || 'Company'),
            });
        }

        return {
            addedCount: mockLeads.length,
            mode: 'mock',
            message: `Generated ${mockLeads.length} demo leads (fallback)`
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
const generateMockLeads = (portalId: string): Omit<Lead, 'id' | 'createdAt'>[] => {
    const mockCompanies = [
        'Reliance Industries Limited',
        'Tata Steel Limited',
        'Jindal Steel & Power Limited',
        'Vedanta Limited',
        'JSW Steel Limited',
    ];

    const mockSectors = [
        'Steel & Metals',
        'Pharmaceuticals',
        'Electronics Manufacturing',
        'Textiles & Apparel',
        'Logistics & Warehousing',
    ];

    const realPortalUrl = REAL_PORTAL_URLS[portalId] || `https://${portalId.toLowerCase()}.gov.in`;

    const leads: Omit<Lead, 'id' | 'createdAt'>[] = [];

    for (let i = 0; i < 3; i++) {
        const company = mockCompanies[i % mockCompanies.length];
        const sector = mockSectors[i % mockSectors.length];

        leads.push({
            companyName: `${company} - Unit ${i + 1}`,
            plotNo: `PLOT-${String(i + 1).padStart(3, '0')}-${portalId}`,
            acreage: 5 + i * 2,
            date: new Date().toISOString().split('T')[0],
            portalId: portalId,
            sourceUrl: `${realPortalUrl}/industrial-allotments`,
            sector: sector,
            website: `https://${company.replace(/\s/g, '').toLowerCase()}.com`,
            contactEmail: `contact@${company.replace(/\s/g, '').toLowerCase()}.com`,
            contactPhone: '+91-XXXXX-XXXXX',
            summary: `Industrial facility specializing in ${sector} in ${PORTAL_STATE_MAP[portalId] || portalId}`,
            status: 'new',
            decisionMakers: [],
        });
    }

    return leads;
};

// ✅ Generate mock decision makers
const generateMockDecisionMakers = (companyName: string): DecisionMaker[] => {
    const titles = [
        { name: 'Rajesh Kumar', role: 'Managing Director', phone: '+91-9876543210' },
        { name: 'Priya Sharma', role: 'Head of Operations', phone: '+91-9876543211' },
        { name: 'Amit Patel', role: 'Project Director', phone: '+91-9876543212' },
    ];

    return titles.map((person) => ({
        name: person.name,
        role: person.role,
        email: `${person.name.toLowerCase().replace(/\s/g, '.')}@${companyName.replace(/\s/g, '').toLowerCase()}.com`,
        contact: person.phone,
    }));
};

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
InfraScout AI Team`
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
                        decisionMakers: backendResult.decisionMakers
                    });
                } catch (updateError) {
                    console.warn('Could not update lead with decision makers:', updateError);
                }
            }

            return backendResult.decisionMakers;
        }

        // Fallback to mock decision makers
        return generateMockDecisionMakers(company);
    } catch (error) {
        console.error('Error in deep research:', error);
        return generateMockDecisionMakers(company);
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
        await updateDoc(doc(db, 'leads', leadId), { decisionMakers });
        return true;
    } catch (error) {
        console.error('Error adding decision makers:', error);
        return false;
    }
};

// ✅ Seed dummy data to database
export const seedDummyDataToDB = async (): Promise<{ success: boolean; count: number; message: string }> => {
    console.log('🌱 Seeding dummy data to Firebase...');

    try {
        const backendResult = await callApiWithFallback('seedDummyData', 'POST', {}, 30000);

        if (backendResult?.success) {
            console.log(`✅ Seeded ${backendResult.count} dummy leads`);
            return {
                success: true,
                count: backendResult.count,
                message: backendResult.message
            };
        }

        throw new Error('Seeding failed');
    } catch (error: any) {
        console.error('Error seeding data:', error);
        return {
            success: false,
            count: 0,
            message: `Error: ${error.message}`
        };
    }
};

// ✅ Clear all demo data from database
export const clearAllDemoData = async (): Promise<{ success: boolean; count: number; message: string }> => {
    console.log('🗑️ Clearing demo data from Firebase...');

    try {
        const backendResult = await callApiWithFallback('clearDemoDataFunction', 'POST', {}, 30000);

        if (backendResult?.success) {
            console.log(`✅ Deleted ${backendResult.count} demo leads`);
            return {
                success: true,
                count: backendResult.count,
                message: backendResult.message
            };
        }

        throw new Error('Clearing failed');
    } catch (error: any) {
        console.error('Error clearing data:', error);
        return {
            success: false,
            count: 0,
            message: `Error: ${error.message}`
        };
    }
};
