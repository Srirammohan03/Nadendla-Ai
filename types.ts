import { Timestamp } from 'firebase/firestore';

export interface DecisionMaker {
  name: string;
  role: string;
  contact?: string;
  email?: string;
}

export type LeadStatus = 'new' | 'viewed' | 'researched' | 'contacted';

export interface Lead {
  id: string;
  companyName: string | null;
  plotNo: string | null;
  acreage: number | null;
  datePosted?: Date | null; // Date when lead was posted
  date?: string | null; // ISO Date String (legacy)
  portalId: string;
  sourceUrl: string;
  sector: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  summary?: string | null;
  decisionMakers?: DecisionMaker[];
  status?: LeadStatus;
  createdAt: Timestamp;
}

export interface DraftEmailResponse {
  subject: string;
  body: string;
}

export enum PortalId {
  AP_APIIC = 'Andhra Pradesh (APIIC)',
  BR_BIADA = 'Bihar (BIADA)',
  CG_CSIDC = 'Chhattisgarh (CSIDC)',
  GJ_GIDC = 'Gujarat (GIDC)',
  HR_HSIIDC = 'Haryana (HSIIDC)',
  KA_KIADB = 'Karnataka (KIADB)',
  KL_KINFRA = 'Kerala (KINFRA)',
  MP_MPIDC = 'Madhya Pradesh (MPIDC)',
  MH_MIDC = 'Maharashtra (MIDC)',
  OD_IDCO = 'Odisha (IDCO)',
  PB_PSIEC = 'Punjab (PSIEC)',
  RJ_RIICO = 'Rajasthan (RIICO)',
  TN_SIPCOT = 'Tamil Nadu (SIPCOT)',
  TG_TGIIC = 'Telangana (TGIIC)',
  UP_UPSIDA = 'Uttar Pradesh (UPSIDA)',
  WB_WBIIDC = 'West Bengal (WBIIDC)'
}