// functions/src/config.ts

export interface PortalConfig {
  id: string;
  name: string;
  url: string;
  /** The exact page to scrape for allotment data */
  dataUrl: string;
  tableSelector?: string;
  stateName: string;
  allotmentPath?: string[];
}

export const PORTALS: PortalConfig[] = [
  {
    id: "AP_APIIC",
    name: "APIIC",
    url: "https://apiic.in",
    // PRD source: apiic.in/list-of-allotments/
    dataUrl: "https://apiic.in/list-of-allotments/",
    tableSelector: "table, .entry-content, article, .elementor-widget-container, .wp-block-table",
    allotmentPath: [],
    stateName: "Andhra Pradesh",
  },
  {
    id: "TG_TGIIC",
    name: "TGIIC",
    url: "https://tgiic.telangana.gov.in",
    // PRD source: tgiic.telangana.gov.in/showView?div_id=22 (actual data table, not blog)
    dataUrl: "https://tgiic.telangana.gov.in/showView?div_id=22",
    tableSelector: "table, tr, td, .data-table, #main-content",
    allotmentPath: ["/showView?div_id=22"],
    stateName: "Telangana",
  },
  {
    id: "MH_MIDC",
    name: "MIDC",
    url: "https://www.midcindia.org",
    dataUrl: "https://www.midcindia.org/en/investors/land-allotment/",
    tableSelector: "table, .table-responsive, tr, td",
    allotmentPath: ["/en/investors/land-allotment/"],
    stateName: "Maharashtra",
  },
  {
    id: "KA_KIADB",
    name: "KIADB",
    url: "https://kiadb.in",
    dataUrl: "https://kiadb.in/allotment-details/",
    tableSelector: "table, tr, td, .elementor-widget-container",
    allotmentPath: ["/allotment-details/"],
    stateName: "Karnataka",
  },
  {
    id: "TN_SIPCOT",
    name: "SIPCOT",
    url: "https://sipcot.tn.gov.in",
    dataUrl: "https://sipcot.tn.gov.in/land-allotment",
    tableSelector: "table, tr, td",
    allotmentPath: ["/land-allotment"],
    stateName: "Tamil Nadu",
  },
  {
    id: "GJ_GIDC",
    name: "GIDC",
    url: "https://gidc.gujarat.gov.in",
    dataUrl: "https://gidc.gujarat.gov.in/allotment-status",
    tableSelector: "table, tr, td",
    allotmentPath: ["/allotment-status"],
    stateName: "Gujarat",
  },
];