// constants\portals.ts
export interface FrontendPortalConfig {
    id: string;
    name: string;
    url: string;
    dataUrl: string;
    shortCode: string;
    color: string;
    stateName: string;
}

export const PORTALS_LIST: FrontendPortalConfig[] = [
    { id: 'AP_APIIC', name: 'APIIC', url: 'https://apiic.in', dataUrl: 'https://apiic.in/allotment-list', shortCode: 'AP', color: 'bg-blue-600', stateName: 'Andhra Pradesh' },
    { id: 'TG_TGIIC', name: 'TGIIC', url: 'https://tgiic.telangana.gov.in', dataUrl: 'https://tgiic.telangana.gov.in/land-allotments', shortCode: 'TG', color: 'bg-violet-600', stateName: 'Telangana' },
    { id: 'MH_MIDC', name: 'MIDC', url: 'https://www.midcindia.org', dataUrl: 'https://www.midcindia.org/en/investors/land-allotment/', shortCode: 'MH', color: 'bg-orange-500', stateName: 'Maharashtra' },
    { id: 'KA_KIADB', name: 'KIADB', url: 'https://kiadb.in', dataUrl: 'https://kiadb.in/allotment-details/', shortCode: 'KA', color: 'bg-yellow-500', stateName: 'Karnataka' },
    { id: 'TN_SIPCOT', name: 'SIPCOT', url: 'https://sipcot.tn.gov.in', dataUrl: 'https://sipcot.tn.gov.in/land-allotment', shortCode: 'TN', color: 'bg-green-600', stateName: 'Tamil Nadu' },
    { id: 'GJ_GIDC', name: 'GIDC', url: 'https://gidc.gujarat.gov.in', dataUrl: 'https://gidc.gujarat.gov.in/allotment-status', shortCode: 'GJ', color: 'bg-red-500', stateName: 'Gujarat' },
];