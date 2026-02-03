export interface FrontendPortalConfig {
    id: string;
    name: string;
    url: string;
    shortCode: string;
    color: string;
}

export const PORTALS_LIST: FrontendPortalConfig[] = [
    { id: 'AP_APIIC', name: 'Andhra Pradesh', url: 'https://apiic.in', shortCode: 'AP', color: 'bg-blue-600' },
    { id: 'BR_BIADA', name: 'Bihar', url: 'https://biadabihar.in', shortCode: 'BR', color: 'bg-red-600' },
    { id: 'CG_CSIDC', name: 'Chhattisgarh', url: 'https://csidc.in', shortCode: 'CG', color: 'bg-green-600' },
    { id: 'GJ_GIDC', name: 'Gujarat', url: 'https://gidc.gujarat.gov.in', shortCode: 'GJ', color: 'bg-orange-500' },
    { id: 'HR_HSIIDC', name: 'Haryana', url: 'https://hsiidc.org.in', shortCode: 'HR', color: 'bg-amber-600' },
    { id: 'KA_KIADB', name: 'Karnataka', url: 'https://kiadb.in', shortCode: 'KA', color: 'bg-yellow-600' },
    { id: 'KL_KINFRA', name: 'Kerala', url: 'https://kinfra.org', shortCode: 'KL', color: 'bg-emerald-600' },
    { id: 'MP_MPIDC', name: 'Madhya Pradesh', url: 'https://invest.mp.gov.in', shortCode: 'MP', color: 'bg-teal-600' },
    { id: 'MH_MIDC', name: 'Maharashtra', url: 'https://midcindia.org', shortCode: 'MH', color: 'bg-indigo-600' },
    { id: 'OD_IDCO', name: 'Odisha', url: 'https://idco.in', shortCode: 'OD', color: 'bg-cyan-600' },
    { id: 'PB_PSIEC', name: 'Punjab', url: 'https://psiec.punjab.gov.in', shortCode: 'PB', color: 'bg-sky-600' },
    { id: 'RJ_RIICO', name: 'Rajasthan', url: 'https://riico.co.in', shortCode: 'RJ', color: 'bg-pink-600' },
    { id: 'TN_SIPCOT', name: 'Tamil Nadu', url: 'https://sipcot.tn.gov.in', shortCode: 'TN', color: 'bg-rose-600' },
    { id: 'TG_TGIIC', name: 'Telangana', url: 'https://tgiic.telangana.gov.in', shortCode: 'TG', color: 'bg-violet-600' },
    { id: 'UP_UPSIDA', name: 'Uttar Pradesh', url: 'https://onlineupsida.com', shortCode: 'UP', color: 'bg-purple-600' },
    { id: 'WB_WBIIDC', name: 'West Bengal', url: 'https://wbiidc.wb.gov.in', shortCode: 'WB', color: 'bg-lime-600' },
];