"use strict";
// functions/src/config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORTALS = void 0;
exports.PORTALS = [
    // ---------------------------------------------------------
    // SOUTH INDIA
    // ---------------------------------------------------------
    {
        id: "AP_APIIC",
        name: "APIIC",
        url: "https://apiic.in",
        dataUrl: "https://apiic.in/list-of-allotments/",
        tableSelector: "table, .entry-content, article, .elementor-widget-container, .wp-block-table",
        allotmentPath: [],
        stateName: "Andhra Pradesh",
    },
    {
        id: "TG_TGIIC",
        name: "TGIIC",
        url: "https://tgiic.telangana.gov.in",
        dataUrl: "https://tgiic.telangana.gov.in/showView?div_id=22",
        tableSelector: "table, tr, td, .data-table, #main-content",
        allotmentPath: ["/showView?div_id=22"],
        stateName: "Telangana",
    },
    // {
    //   id: "KA_KIADB",
    //   name: "KIADB",
    //   url: "https://kiadb.karnataka.gov.in/",
    //   dataUrl: "https://kiadb.karnataka.gov.in/New_Kiadb/Pages/AllotmentList.aspx",
    //   tableSelector: "table, .elementor-widget-table, .elementor-text-editor",
    //   allotmentPath: ["/allotment-details/", "/vacant-plots/"],
    //   stateName: "Karnataka",
    // },
    {
        id: "TN_SIPCOT",
        name: "SIPCOT",
        url: "https://sipcot.tn.gov.in",
        dataUrl: "https://sipcot.tn.gov.in/portal/reports/landdetails",
        tableSelector: "table, .table-responsive, #allotment_table",
        allotmentPath: ["/pages/view/allotment-details"],
        stateName: "Tamil Nadu",
    },
    // ---------------------------------------------------------
    // WEST INDIA
    // ---------------------------------------------------------
    {
        id: "MH_MIDC",
        name: "MIDC",
        url: "https://www.midcindia.org",
        // MIDC uses a dedicated land bank subdomain for raw data
        dataUrl: "https://land.midcindia.org/LandBank/IndexforAllRecords",
        tableSelector: "table, #example, .table-striped, .table-bordered",
        allotmentPath: ["/en/investors/land-allotment/"],
        stateName: "Maharashtra",
    },
    {
        id: "GJ_GIDC",
        name: "GIDC",
        url: "https://gidc.gujarat.gov.in",
        dataUrl: "https://egov.gidcgujarat.org/gidcgg/LandEstateDetails.aspx",
        tableSelector: "table, .table-responsive, .content_area",
        allotmentPath: ["/gidcgg/LandEstateDetails.aspx"],
        stateName: "Gujarat",
    },
    // {
    //   id: "RJ_RIICO",
    //   name: "RIICO",
    //   url: "https://industries.rajasthan.gov.in/riico",
    //   dataUrl: "https://industries.rajasthan.gov.in/content/industries/riico/vacant-plots.html",
    //   tableSelector: "table, .table, .content",
    //   allotmentPath: ["/vacant-plots.html", "/tender.html"],
    //   stateName: "Rajasthan",
    // },
    // ---------------------------------------------------------
    // NORTH INDIA
    // ---------------------------------------------------------
    // {
    //   id: "HR_HSIIDC",
    //   name: "HSIIDC",
    //   url: "https://hsiidc.org.in",
    //   dataUrl: "https://hsiidc.org.in/estate-management/allotment-of-plot",
    //   tableSelector: "table, .table-bordered, .field-items",
    //   allotmentPath: ["/estate-management/allotment-of-plot", "/vacant-plots"],
    //   stateName: "Haryana",
    // },
    {
        id: "UP_UPSIDA",
        name: "UPSIDA",
        url: "https://onlineupsidc.com",
        dataUrl: "https://eservices.onlineupsida.com/Advertisement.aspx",
        tableSelector: "table, #GridView1, .datatable",
        allotmentPath: ["/eservices.onlineupsida.com/Advertisement.aspx", "/allotment"],
        stateName: "Uttar Pradesh",
    },
    {
        id: "PB_PSIEC",
        name: "PSIEC",
        url: "https://psiec.punjab.gov.in",
        dataUrl: "https://psiec.punjab.gov.in/landbank-commercial/",
        tableSelector: "table, .table, .page-content",
        allotmentPath: ["/landbank-commercial/", "/landbank-industrial/", "/landbank-residential/"],
        stateName: "Punjab",
    },
    // ---------------------------------------------------------
    // CENTRAL & EAST INDIA
    // ---------------------------------------------------------
    // {
    //   id: "MP_MPIDC",
    //   name: "MPIDC",
    //   url: "https://invest.mp.gov.in",
    //   dataUrl: "https://invest.mp.gov.in/land-availability",
    //   tableSelector: "table, .table-responsive, .land-bank-table",
    //   allotmentPath: ["/land-availability", "/allotment"],
    //   stateName: "Madhya Pradesh",
    // },
    {
        id: "OD_IDCO",
        name: "IDCO",
        url: "https://portal.idco.in",
        dataUrl: "https://portal.idco.in/Reports/FindUnitDetailsRpt.aspx",
        tableSelector: "table, .table-bordered, .content",
        allotmentPath: ["/Reports/FindUnitDetailsRpt.aspx"],
        stateName: "Odisha",
    },
    {
        id: "CG_CSIDC",
        name: "CSIDC",
        url: "https://industries.cg.gov.in",
        dataUrl: "https://industries.cg.gov.in/csidc/land_allot.html",
        tableSelector: "table, .bodytext, .table1",
        allotmentPath: ["/csidc/land_allot.html"],
        stateName: "Chhattisgarh",
    },
    {
        id: "BR_BIADA",
        name: "BIADA",
        url: "https://www.biadabihar.in",
        dataUrl: "https://www.biadabihar.in/public/allotment",
        tableSelector: "table, .table-striped, .content",
        allotmentPath: ["/public/allotment"],
        stateName: "Bihar",
    },
    {
        id: "WB_WBIIDC",
        name: "WBIIDC",
        url: "https://wbiidc.wb.gov.in",
        dataUrl: "https://wbiidc.wb.gov.in/home/allotment_order",
        tableSelector: "table, .table-hover, #main_content",
        allotmentPath: ["/home/allotment_order", "/investor_desk"],
        stateName: "West Bengal",
    }
];
