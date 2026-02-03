import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { Lead } from "../types";
import LeadRow from "./LeadRow";
import LeadPreview from "./LeadPreview";
import {
  triggerDailyScout,
  draftColdEmail,
  seedDummyDataToDB,
  clearAllDemoData,
} from "../services/api";
import toast from "react-hot-toast";
import {
  Loader2,
  RefreshCw,
  X,
  Search,
  Bell,
  PauseCircle,
  PlayCircle,
  Send,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { PORTALS_LIST } from "../constants/portals";
import clsx from "clsx";

const LeadsDashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [scoutingPortal, setScoutingPortal] = useState<string | null>(null);

  // State for portal filter
  const [activePortalFilter, setActivePortalFilter] = useState<string | null>(
    null,
  );
  const [newCount, setNewCount] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "leads"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leadsData: Lead[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Lead[];

        setLeads(leadsData);
        setLoading(false);

        if (leadsData.length > 0 && !selectedLead) {
          setSelectedLead(leadsData[0]);
        }

        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000,
        );
        const newLeads = leadsData.filter((lead) => {
          const createdAt =
            lead.createdAt instanceof Timestamp
              ? lead.createdAt.toDate()
              : new Date(lead.createdAt);
          return (
            createdAt > twentyFourHoursAgo &&
            lead.status !== "researched" &&
            lead.status !== "contacted"
          );
        });

        if (newLeads.length > 0) {
          setNewCount(newLeads.length);
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        toast.error("Failed to load leads.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showOnlyNew, activePortalFilter]);

  const handlePortalScout = async (
    portalId: string,
    portalName: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    setActivePortalFilter(portalId);
    setScoutingPortal(portalId);
    const toastId = toast.loading(`Scanning ${portalName}...`);
    try {
      const result = await triggerDailyScout(portalId);
      if (result?.addedCount > 0)
        toast.success(`Added ${result.addedCount} leads from ${portalName}`);
      else toast.error(result?.message || `No new leads from ${portalName}`);
    } catch (err: any) {
      toast.error(err?.message || "Scout failed");
    } finally {
      toast.dismiss(toastId);
      setScoutingPortal(null);
    }
  };

  const handleDraftEmail = async (lead: Lead) => {
    setEmailModalOpen(true);
    setEmailDraft(null);
    setEmailLoading(true);

    try {
      const draft = await draftColdEmail(lead);
      setEmailDraft(draft);
    } catch (error) {
      toast.error("Failed to generate draft.");
      setEmailModalOpen(false);
    } finally {
      setEmailLoading(false);
    }
  };

  const isNew = (timestamp: Timestamp) => {
    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
  };

  // Filter Logic
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.companyName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (lead.sector?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (lead.portalId?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesNew = showOnlyNew ? isNew(lead.createdAt) : true;

    // Portal Filter
    const matchesPortal = activePortalFilter
      ? lead.portalId === activePortalFilter
      : true;

    return matchesSearch && matchesNew && matchesPortal;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Search */}
          <div className="flex items-center gap-8 w-full md:w-auto">
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                ✦
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">
                  InfraScout AI
                </h1>
                <p className="text-[10px] text-gray-400 font-medium">
                  Ready-to-call land allotment leads
                </p>
              </div>
            </div>

            <div className="relative w-full md:w-96 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search company / sector / portal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-sm rounded-full py-2 pl-9 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlyNew(!showOnlyNew)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${showOnlyNew ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700"}`}
              >
                ⏱ Last 24h
              </button>
            </div>

            {/* Data Seeding Controls */}
            {/* <div className="hidden md:flex items-center gap-2 border-l border-slate-700 pl-4">
              <button
                onClick={async () => {
                  const toastId = toast.loading("🌱 Seeding 48 dummy leads...");
                  const result = await seedDummyDataToDB();
                  toast.dismiss(toastId);
                  if (result.success) {
                    toast.success(`${result.message}`);
                  } else {
                    toast.error(`${result.message}`);
                  }
                }}
                className="text-xs font-medium px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30 transition-all"
                title="Seed demo data (48 leads × 16 states)"
              >
                🌱 Seed
              </button>
              <button
                onClick={async () => {
                  const toastId = toast.loading("🗑️ Clearing demo data...");
                  const result = await clearAllDemoData();
                  toast.dismiss(toastId);
                  if (result.success) {
                    toast.success(`${result.message}`);
                  } else {
                    toast.error(`${result.message}`);
                  }
                }}
                className="text-xs font-medium px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition-all"
                title="Clear all demo data"
              >
                🗑️ Clear
              </button>
            </div> */}

            <div className="relative">
              <Bell className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              {newCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
              )}
            </div>

            <div className="h-6 w-px bg-slate-700 mx-1"></div>

            <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pt-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search company / sector / portal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-sm rounded-full py-2 pl-9 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container mx-auto p-4 md:p-6 lg:p-8 flex-1">
        {/* Alert Banner */}
        {newCount > 0 && (
          <div className="mb-6 bg-slate-900 rounded-lg p-4 flex items-center justify-between shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-center gap-4 z-10">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Morning alert</h3>
                <p className="text-gray-400 text-sm">
                  We found {newCount} new opportunities in the last 24 hours.
                </p>
              </div>
            </div>
            <button
              onClick={() => setNewCount(0)}
              className="text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: List */}
          <div className="w-full lg:w-2/3 space-y-4">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Today's Opportunities
                </h2>
                <p className="text-xs text-gray-500">
                  Newest first • click a row to preview
                </p>
              </div>

              {/* Portal Buttons: Filter & Fetch (Start/Pause Scout) */}
              <div className="flex flex-wrap gap-2">
                {PORTALS_LIST.map((portal) => (
                  <div
                    key={portal.id}
                    onClick={(e) =>
                      handlePortalScout(portal.id, portal.name, e)
                    }
                    className={clsx(
                      "relative group flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all select-none",
                      activePortalFilter === portal.id
                        ? "bg-slate-800 border-slate-900 text-white shadow-md ring-2 ring-indigo-500/30"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                    )}
                    title="Click to Scout/Pause"
                  >
                    <span
                      className={clsx("w-2 h-2 rounded-full", portal.color)}
                    ></span>
                    <span className="text-xs font-bold">
                      {portal.shortCode}
                    </span>

                    {/* Status Indicator */}
                    <div className="ml-1">
                      {scoutingPortal === portal.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      ) : activePortalFilter === portal.id ? (
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <PlayCircle className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                      )}
                    </div>
                  </div>
                ))}
                {activePortalFilter && (
                  <button
                    onClick={() => {
                      setActivePortalFilter(null);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Table Header (Visual Only) */}
            <div className="hidden md:flex px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 rounded-t-lg border-b border-gray-100">
              <div className="flex-1 pl-2">Company</div>
              <div className="w-24">Plot</div>
              <div className="w-20">Acreage</div>
              <div className="w-24">Date</div>
              <div className="w-28">Sector</div>
              <div className="w-32">Portal</div>
              <div className="w-24 text-right pr-2">Actions</div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">
                    No leads found matching criteria.
                  </p>
                  {activePortalFilter && (
                    <button
                      onClick={(e) =>
                        handlePortalScout(
                          activePortalFilter,
                          activePortalFilter,
                          e,
                        )
                      }
                      className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-100"
                    >
                      Scout {activePortalFilter} Now
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {paginatedLeads.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      isNew={isNew(lead.createdAt)}
                      isSelected={selectedLead?.id === lead.id}
                      onSelect={setSelectedLead}
                      onDraftEmail={handleDraftEmail}
                    />
                  ))}

                  {/* Pagination Controls */}
                  {filteredLeads.length > itemsPerPage && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4 px-2">
                      <div className="text-xs text-gray-500">
                        Showing{" "}
                        <span className="font-medium text-gray-700">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-gray-700">
                          {Math.min(
                            currentPage * itemsPerPage,
                            filteredLeads.length,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-gray-700">
                          {filteredLeads.length}
                        </span>{" "}
                        results
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-center bg-gray-50 py-1 rounded">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="w-full lg:w-1/3 hidden lg:block">
            <LeadPreview lead={selectedLead} />
          </div>
        </div>
      </main>

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-gray-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                Draft Email
              </h3>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto bg-white flex-1">
              {emailLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-indigo-50 p-3 rounded-full">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 animate-pulse">
                    Drafting with Gemini Pro...
                  </p>
                </div>
              ) : emailDraft ? (
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-medium">
                      Subject:
                    </span>
                    <input
                      readOnly
                      value={emailDraft.subject}
                      className="w-full pl-20 pr-3 py-2 border-b border-gray-200 text-gray-800 focus:outline-none focus:border-indigo-500 font-medium text-sm"
                    />
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={emailDraft.body}
                      className="w-full h-80 p-4 border border-gray-200 rounded-lg bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans text-sm leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-red-500 flex items-center gap-2 justify-center h-full">
                  <X className="w-5 h-5" />
                  Failed to load draft.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach file</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${emailDraft?.subject}\n\n${emailDraft?.body}`,
                    );
                    toast.success("Copied to clipboard!");
                  }}
                  disabled={!emailDraft}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm shadow-sm transition-all hover:shadow-md"
                >
                  Copy & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsDashboard;
