import * as admin from 'firebase-admin';

// Initialize Admin SDK
const db = admin.firestore();

// Real Indian company names by sector
const COMPANIES_BY_SECTOR: Record<string, string[]> = {
    'Steel & Metals': [
        'Reliance Steel Industries Ltd',
        'Tata Steel Manufacturing Unit',
        'Jindal Steel & Power Limited',
        'Vedanta Limited Steel Division',
        'JSW Steel Production Facility',
    ],
    'Pharmaceuticals': [
        'Dr. Reddy\'s Laboratories Pvt Ltd',
        'Cipla Limited Production Unit',
        'Lupin Limited Manufacturing',
        'Aurobindo Pharma Ltd',
        'Torrent Pharmaceuticals Ltd',
    ],
    'Electronics & IT Hardware': [
        'Foxconn Electronics India Ltd',
        'Flex Ltd Electronics',
        'Sanmina Electronics Manufacturing',
        'Pegatron Technology India',
        'Wistron Technology Services',
    ],
    'Textiles & Apparel': [
        'Arvind Limited Textile Mills',
        'Reliance Brands Manufacturing',
        'Welspun Global Textiles Ltd',
        'Trident Textiles Ltd',
        'Lakshmi Machine Works Ltd',
    ],
    'Logistics & Warehousing': [
        'Allcargo Logistics Limited',
        'GATI Limited Logistics',
        'TCI Express Limited',
        'Safexpress Pvt Ltd',
        'Blue Dart Express Limited',
    ],
    'Automotive': [
        'Maruti Suzuki India Limited',
        'Hyundai Motor India Limited',
        'Mahindra & Mahindra Ltd',
        'Bajaj Auto Limited',
        'Hero MotoCorp Limited',
    ],
    'FMCG & Food Processing': [
        'ITC Limited Food Division',
        'Nestlé India Limited',
        'Britannia Industries Limited',
        'Marico Limited',
        'Hindustan Unilever Limited',
    ],
    'Renewable Energy': [
        'Adani Power Limited',
        'Reliance Power Limited',
        'NTPC Green Energy Limited',
        'Suzlon Energy Limited',
        'Inox Wind Limited',
    ],
};

// Real Indian decision maker names
const DECISION_MAKERS = [
    { name: 'Rajesh Kumar Sharma', title: 'Managing Director' },
    { name: 'Priya Sharma', title: 'Head of Operations' },
    { name: 'Amit Patel', title: 'Project Director' },
    { name: 'Vikas Singh', title: 'Plant Head' },
    { name: 'Neha Gupta', title: 'Operations Manager' },
    { name: 'Sanjay Verma', title: 'Production Director' },
    { name: 'Anita Desai', title: 'Chief Financial Officer' },
    { name: 'Deepak Nair', title: 'Manufacturing Head' },
    { name: 'Suresh Menon', title: 'Site Manager' },
    { name: 'Kavya Iyer', title: 'Technical Director' },
];

// Real portal URLs and state info
const PORTAL_INFO: Record<string, { name: string; url: string; state: string }> = {
    'AP_APIIC': { name: 'APIIC', url: 'https://apiic.in', state: 'Andhra Pradesh' },
    'BR_BIADA': { name: 'BIADA', url: 'https://biadabihar.in', state: 'Bihar' },
    'CG_CSIDC': { name: 'CSIDC', url: 'https://csidc.in', state: 'Chhattisgarh' },
    'GJ_GIDC': { name: 'GIDC', url: 'https://gidc.gujarat.gov.in', state: 'Gujarat' },
    'HR_HSIIDC': { name: 'HSIIDC', url: 'https://hsiidc.org.in', state: 'Haryana' },
    'KA_KIADB': { name: 'KIADB', url: 'https://kiadb.in', state: 'Karnataka' },
    'KL_KINFRA': { name: 'KINFRA', url: 'https://kinfra.org', state: 'Kerala' },
    'MP_MPIDC': { name: 'MPIDC', url: 'https://invest.mp.gov.in', state: 'Madhya Pradesh' },
    'MH_MIDC': { name: 'MIDC', url: 'https://midcindia.org', state: 'Maharashtra' },
    'OD_IDCO': { name: 'IDCO', url: 'https://idco.in', state: 'Odisha' },
    'PB_PSIEC': { name: 'PSIEC', url: 'https://psiec.punjab.gov.in', state: 'Punjab' },
    'RJ_RIICO': { name: 'RIICO', url: 'https://riico.co.in', state: 'Rajasthan' },
    'TN_SIPCOT': { name: 'SIPCOT', url: 'https://sipcot.tn.gov.in', state: 'Tamil Nadu' },
    'TG_TGIIC': { name: 'TGIIC', url: 'https://tgiic.telangana.gov.in', state: 'Telangana' },
    'UP_UPSIDA': { name: 'UPSIDA', url: 'https://onlineupsida.com', state: 'Uttar Pradesh' },
    'WB_WBIIDC': { name: 'WBIIDC', url: 'https://wbiidc.wb.gov.in', state: 'West Bengal' },
};

// Generate realistic dummy data - 3 leads per state (48 total)
export const generateDummyLeads = async (): Promise<{ success: boolean; count: number; message: string }> => {
    try {
        let addedCount = 0;

        // For each portal
        for (const [portalId, portalData] of Object.entries(PORTAL_INFO)) {
            const sectors = Object.keys(COMPANIES_BY_SECTOR);

            // 3 leads per portal
            for (let i = 0; i < 3; i++) {
                const sector = sectors[i % sectors.length];
                const companies = COMPANIES_BY_SECTOR[sector];
                const company = companies[Math.floor(Math.random() * companies.length)];

                // Generate 3 decision makers
                const decisionMakers = [];
                const usedIndexes = new Set<number>();
                while (decisionMakers.length < 3) {
                    const randomIndex = Math.floor(Math.random() * DECISION_MAKERS.length);
                    if (!usedIndexes.has(randomIndex)) {
                        usedIndexes.add(randomIndex);
                        const dm = DECISION_MAKERS[randomIndex];
                        decisionMakers.push({
                            name: dm.name,
                            role: dm.title,
                            email: `${dm.name.toLowerCase().replace(/\s/g, '.')}@${company.toLowerCase().replace(/\s|&|-/g, '')}.com`,
                            contact: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                        });
                    }
                }

                // Create lead document
                const leadData = {
                    companyName: `${company} - ${portalData.state} Unit ${i + 1}`,
                    plotNo: `PLOT-${String(i + 1).padStart(3, '0')}-${portalId}`,
                    acreage: 5 + i * 2,
                    date: new Date().toISOString().split('T')[0],
                    portalId: portalId,
                    sourceUrl: `${portalData.url}/industrial-allotments`,
                    sector: sector,
                    website: `https://${company.toLowerCase().replace(/\s|&|-/g, '')}.com`,
                    contactEmail: `enquiry@${company.toLowerCase().replace(/\s|&|-/g, '')}.com`,
                    contactPhone: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                    summary: `Industrial facility for ${sector} operations in ${portalData.state}. State-of-the-art infrastructure with excellent connectivity to major markets and transportation hubs.`,
                    decisionMakers: decisionMakers,
                    status: 'new',
                    createdAt: admin.firestore.Timestamp.now(),
                    isDemoData: true,
                };

                // Add to Firestore
                await db.collection('leads').add(leadData);
                addedCount++;
            }
        }

        return {
            success: true,
            count: addedCount,
            message: `✅ Successfully seeded ${addedCount} dummy leads (3 per state × 16 states)`,
        };
    } catch (error: any) {
        console.error('Error seeding data:', error);
        return {
            success: false,
            count: 0,
            message: `❌ Error seeding data: ${error.message}`,
        };
    }
};

// Clear all demo data
export const clearDemoData = async (): Promise<{ success: boolean; count: number; message: string }> => {
    try {
        const snapshot = await db.collection('leads').where('isDemoData', '==', true).get();

        let deletedCount = 0;
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
            deletedCount++;
        }

        return {
            success: true,
            count: deletedCount,
            message: `✅ Deleted ${deletedCount} demo leads`,
        };
    } catch (error: any) {
        console.error('Error clearing demo data:', error);
        return {
            success: false,
            count: 0,
            message: `❌ Error clearing data: ${error.message}`,
        };
    }
};
