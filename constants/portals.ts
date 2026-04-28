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
    { id: 'BR_BIADA', name: 'BIADA', url: 'https://biadabihar.in', dataUrl: 'https://biadabihar.in/land-allotment', shortCode: 'BR', color: 'bg-red-600', stateName: 'Bihar' },
    { id: 'CG_CSIDC', name: 'CSIDC', url: 'https://csidc.in', dataUrl: 'https://csidc.in/allottees', shortCode: 'CG', color: 'bg-green-600', stateName: 'Chhattisgarh' },
    { id: 'GJ_GIDC', name: 'GIDC', url: 'https://gidc.gujarat.gov.in', dataUrl: 'https://gidc.gujarat.gov.in/land-allotment', shortCode: 'GJ', color: 'bg-orange-500', stateName: 'Gujarat' },
    { id: 'HR_HSIIDC', name: 'HSIIDC', url: 'https://hsiidc.org.in', dataUrl: 'https://hsiidc.org.in/allotment-list', shortCode: 'HR', color: 'bg-amber-600', stateName: 'Haryana' },
    { id: 'KA_KIADB', name: 'KIADB', url: 'https://kiadb.in', dataUrl: 'https://kiadb.in/allottees', shortCode: 'KA', color: 'bg-yellow-600', stateName: 'Karnataka' },
    { id: 'KL_KINFRA', name: 'KINFRA', url: 'https://kinfra.org', dataUrl: 'https://kinfra.org/allottees', shortCode: 'KL', color: 'bg-emerald-600', stateName: 'Kerala' },
    { id: 'MP_MPIDC', name: 'MPIDC', url: 'https://invest.mp.gov.in', dataUrl: 'https://invest.mp.gov.in/mpidc/allotment', shortCode: 'MP', color: 'bg-teal-600', stateName: 'Madhya Pradesh' },
    { id: 'MH_MIDC', name: 'MIDC', url: 'https://midcindia.org', dataUrl: 'https://midcindia.org/land-allotment', shortCode: 'MH', color: 'bg-indigo-600', stateName: 'Maharashtra' },
    { id: 'OD_IDCO', name: 'IDCO', url: 'https://idco.in', dataUrl: 'https://idco.in/allottees', shortCode: 'OD', color: 'bg-cyan-600', stateName: 'Odisha' },
    { id: 'PB_PSIEC', name: 'PSIEC', url: 'https://psiec.punjab.gov.in', dataUrl: 'https://psiec.punjab.gov.in/land-allotment', shortCode: 'PB', color: 'bg-sky-600', stateName: 'Punjab' },
    { id: 'RJ_RIICO', name: 'RIICO', url: 'https://riico.co.in', dataUrl: 'https://riico.co.in/allottees', shortCode: 'RJ', color: 'bg-pink-600', stateName: 'Rajasthan' },
    { id: 'TN_SIPCOT', name: 'SIPCOT', url: 'https://sipcot.tn.gov.in', dataUrl: 'https://sipcot.tn.gov.in/allottees', shortCode: 'TN', color: 'bg-rose-600', stateName: 'Tamil Nadu' },
    { id: 'TG_TGIIC', name: 'TGIIC', url: 'https://tgiic.telangana.gov.in', dataUrl: 'https://tgiic.telangana.gov.in/land-allotments', shortCode: 'TG', color: 'bg-violet-600', stateName: 'Telangana' },
    { id: 'UP_UPSIDA', name: 'UPSIDA', url: 'https://onlineupsida.com', dataUrl: 'https://onlineupsida.com/allotment', shortCode: 'UP', color: 'bg-purple-600', stateName: 'Uttar Pradesh' },
    { id: 'WB_WBIIDC', name: 'WBIIDC', url: 'https://wbiidc.wb.gov.in', dataUrl: 'https://wbiidc.wb.gov.in/land-allotment', shortCode: 'WB', color: 'bg-lime-600', stateName: 'West Bengal' },
];