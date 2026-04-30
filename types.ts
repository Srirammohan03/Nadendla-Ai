import { Timestamp } from 'firebase/firestore';

export interface DecisionMaker {
  name: string;
  role: string;
  contact?: string | null;
  email?: string | null;
}

export type LeadStatus = 'new' | 'viewed' | 'researched' | 'contacted';

export interface Lead {
  id: string;
  companyName: string | null;
  plotNo: string | null;
  acreage: number | null;
  /** Legacy ISO date string from backend extraction */
  date?: string | null;
  /** Portal identifier e.g. "AP_APIIC" */
  portalId: string;
  /** Human readable portal name e.g. "APIIC" */
  portalName?: string | null;
  sourceUrl: string;
  sector: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  summary?: string | null;
  decisionMakers?: DecisionMaker[];
  status?: LeadStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  /** Flag for demo/seed data so it can be cleared separately */
  isDemoData?: boolean;
}

export interface DraftEmailResponse {
  subject: string;
  body: string;
}

export enum PortalId {
  AP_APIIC = 'AP_APIIC',
  TG_TGIIC = 'TG_TGIIC',
  MH_MIDC = 'MH_MIDC',
  KA_KIADB = 'KA_KIADB',
  TN_SIPCOT = 'TN_SIPCOT',
  GJ_GIDC = 'GJ_GIDC',
}