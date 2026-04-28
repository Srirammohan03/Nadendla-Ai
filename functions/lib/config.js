"use strict";
// functions/src/config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORTALS = void 0;
exports.PORTALS = [
    // Telangana - TGIIC
    {
        id: "TG_TGIIC",
        name: "TGIIC",
        url: "https://tgiic.telangana.gov.in",
        dataUrl: "https://tgiic.telangana.gov.in/allotment-status",
        allotmentPath: ["/allotment-status", "/list-of-allottees", "/board-meeting-minutes", "/tenders-and-allotments"],
        stateName: "Telangana",
    },
    // Tamil Nadu - SIPCOT
    {
        id: "TN_SIPCOT",
        name: "SIPCOT",
        url: "https://sipcot.tn.gov.in",
        dataUrl: "https://sipcot.tn.gov.in/list-of-allottees",
        allotmentPath: ["/list-of-allottees", "/rti-disclosures", "/allotment-orders", "/board-resolutions"],
        stateName: "Tamil Nadu",
    },
    // Andhra Pradesh - APIIC
    {
        id: "AP_APIIC",
        name: "APIIC",
        url: "https://apiic.in",
        dataUrl: "https://apiic.in/list-of-allotments",
        allotmentPath: ["/list-of-allotments/", "/plot-of-meetings/", "/allotment-letters/", "/minutes-of-the-plot-allotment-meetings/"],
        stateName: "Andhra Pradesh",
    },
    // Gujarat - GIDC
    {
        id: "GJ_GIDC",
        name: "GIDC",
        url: "https://gidc.gujarat.gov.in",
        dataUrl: "https://gidc.gujarat.gov.in/allotment-list",
        allotmentPath: ["/allotment-list", "/circulars-and-notifications", "/board-decisions"],
        stateName: "Gujarat",
    },
    // Karnataka - KIADB
    {
        id: "KA_KIADB",
        name: "KIADB",
        url: "https://kiadb.in",
        dataUrl: "https://kiadb.in/allottees-details",
        allotmentPath: ["/allottees-details", "/allotment-proceedings", "/board-meeting-details"],
        stateName: "Karnataka",
    },
    // Maharashtra - MIDC
    {
        id: "MH_MIDC",
        name: "MIDC",
        url: "https://midcindia.org",
        dataUrl: "https://midcindia.org/allotment-orders",
        allotmentPath: ["/allotment-orders", "/rti/list-of-allottees", "/circulars"],
        stateName: "Maharashtra",
    },
    // Rajasthan - RIICO
    {
        id: "RJ_RIICO",
        name: "RIICO",
        url: "https://industries.rajasthan.gov.in/riico",
        dataUrl: "https://industries.rajasthan.gov.in/riico/allotment-list",
        allotmentPath: ["/allotment-list", "/office-orders", "/meeting-minutes"],
        stateName: "Rajasthan",
    },
    // Madhya Pradesh - MPIDC
    {
        id: "MP_MPIDC",
        name: "MPIDC",
        url: "https://invest.mp.gov.in",
        dataUrl: "https://invest.mp.gov.in/mpidc/allottees",
        allotmentPath: ["/mpidc/allottees", "/mpidc/land-allotment-orders", "/mpidc/notices"],
        stateName: "Madhya Pradesh",
    },
    // Odisha - IDCO
    {
        id: "OD_IDCO",
        name: "IDCO",
        url: "https://idco.in",
        dataUrl: "https://idco.in/allottees",
        allotmentPath: ["/allottees", "/land-allotment-status", "/orders-and-circulars"],
        stateName: "Odisha",
    },
    // Haryana - HSIIDC
    {
        id: "HR_HSIIDC",
        name: "HSIIDC",
        url: "https://hsiidc.org.in",
        dataUrl: "https://hsiidc.org.in/industrial-land",
        allotmentPath: ["/industrial-land", "/allottee-list", "/board-minutes"],
        stateName: "Haryana",
    },
    // Punjab - PSIEC
    {
        id: "PB_PSIEC",
        name: "PSIEC",
        url: "https://psiec.punjab.gov.in",
        dataUrl: "https://psiec.punjab.gov.in/land-allotment",
        allotmentPath: ["/land-allotment", "/list-of-allottees", "/rti"],
        stateName: "Punjab",
    },
    // Kerala - KINFRA
    {
        id: "KL_KINFRA",
        name: "KINFRA",
        url: "https://kinfra.org",
        dataUrl: "https://kinfra.org/land-allotment",
        allotmentPath: ["/land-allotment", "/allottees", "/transparency"],
        stateName: "Kerala",
    },
    // Chhattisgarh - CSIDC
    {
        id: "CG_CSIDC",
        name: "CSIDC",
        url: "https://csidc.in",
        dataUrl: "https://csidc.in/land-allotment",
        allotmentPath: ["/land-allotment", "/allottee-details", "/orders"],
        stateName: "Chhattisgarh",
    },
    // Bihar - BIADA
    {
        id: "BR_BIADA",
        name: "BIADA",
        url: "https://biadabihar.in",
        dataUrl: "https://biadabihar.in/land-allotment",
        allotmentPath: ["/land-allotment", "/allottees-list", "/board-decisions"],
        stateName: "Bihar",
    },
    // Uttar Pradesh - UPSIDA
    {
        id: "UP_UPSIDA",
        name: "UPSIDA",
        url: "https://onlineupsida.com",
        dataUrl: "https://onlineupsida.com/land-allotment",
        allotmentPath: ["/land-allotment", "/allottee-list", "/orders"],
        stateName: "Uttar Pradesh",
    },
    // West Bengal - WBIIDC
    {
        id: "WB_WBIIDC",
        name: "WBIIDC",
        url: "https://wbiidc.wb.gov.in",
        dataUrl: "https://wbiidc.wb.gov.in/land-allotment",
        allotmentPath: ["/land-allotment", "/list-of-allottees", "/circulars"],
        stateName: "West Bengal",
    },
];
