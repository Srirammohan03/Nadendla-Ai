// components/LeadsDashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { Lead } from "../types";
import LeadRow from "./LeadRow";
import LeadPreview from "./LeadPreview";
import { triggerDailyScout, draftColdEmail } from "../services/api";
import toast from "react-hot-toast";
import {
  Loader2,
  X,
  Search,
  Bell,
  Send,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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
  const [activePortalFilter, setActivePortalFilter] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // ── Real-time Firestore listener ──────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "leads"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leadsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Lead[];

        setLeads(leadsData);
        setLoading(false);

        // Auto-select first lead if none selected, or update the existing selected lead with new data
        setSelectedLead((prev) => {
          if (!prev) return leadsData[0] || null;
          const updated = leadsData.find((l) => l.id === prev.id);
          return updated || prev;
        });

        // Count "new" leads (< 24h, not yet actioned)
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const fresh = leadsData.filter((l) => {
          const t =
            l.createdAt instanceof Timestamp
              ? l.createdAt.toDate().getTime()
              : new Date(l.createdAt as unknown as string).getTime();
          return (
            t > cutoff &&
            l.status !== "researched" &&
            l.status !== "contacted"
          );
        });
        setNewCount(fresh.length);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        toast.error("Failed to load leads from Firestore.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showOnlyNew, activePortalFilter]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isNew = useCallback((ts: Timestamp): boolean => {
    const t =
      ts instanceof Timestamp
        ? ts.toDate().getTime()
        : new Date(ts as unknown as string).getTime();
    return Date.now() - t < 24 * 60 * 60 * 1000;
  }, []);

  const leadsCountByPortal = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      counts[l.portalId] = (counts[l.portalId] || 0) + 1;
    });
    return counts;
  }, [leads]);

  // ── Filtered + paginated leads ────────────────────────────────────────────
  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
          (l.companyName?.toLowerCase() || "").includes(q) ||
          (l.sector?.toLowerCase() || "").includes(q) ||
          (l.portalId?.toLowerCase() || "").includes(q) ||
          (l.portalName?.toLowerCase() || "").includes(q);
        const matchNew = showOnlyNew ? isNew(l.createdAt) : true;
        const matchPortal = activePortalFilter
          ? l.portalId === activePortalFilter
          : true;
        return matchSearch && matchNew && matchPortal;
      }),
    [leads, searchTerm, showOnlyNew, activePortalFilter, isNew]
  );

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePortalFilter = useCallback((portalId: string) => {
    setActivePortalFilter((prev) => (prev === portalId ? null : portalId));
  }, []);

  const handlePortalScout = useCallback(
    async (portalId: string, portalName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (scoutingPortal) {
        toast("Already scouting — please wait…");
        return;
      }
      setScoutingPortal(portalId);
      setActivePortalFilter(portalId);
      const toastId = toast.loading(
        `🔍 Scouting ${portalName}… (this may take 2–3 min)`
      );
      try {
        const result = await triggerDailyScout(portalId);
        if ((result?.addedCount ?? 0) > 0) {
          toast.success(
            `✅ Added ${result.addedCount} new leads from ${portalName}!`,
            { duration: 6000 }
          );
        } else {
          toast.error(
            result?.message || `No new leads found for ${portalName}`,
            { duration: 6000 }
          );
        }
      } catch (err: any) {
        toast.error(err?.message || "Scout failed");
      } finally {
        toast.dismiss(toastId);
        setScoutingPortal(null);
      }
    },
    [scoutingPortal]
  );

  const handleDraftEmail = async (lead: Lead) => {
    setEmailModalOpen(true);
    setEmailDraft(null);
    setEmailLoading(true);
    try {
      const draft = await draftColdEmail(lead);
      setEmailDraft(draft);
    } catch {
      toast.error("Failed to generate draft.");
      setEmailModalOpen(false);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navbar ── */}
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo + Search */}
          <div className="flex items-center gap-8 w-full md:w-auto">
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg">
                ✦
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">
                  Nadendla AI
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
                className="w-full bg-slate-800 border border-slate-700 text-sm rounded-full py-2 pl-9 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => setShowOnlyNew((v) => !v)}
              className={clsx(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                showOnlyNew
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700"
              )}
            >
              ⏱ Last 24h
            </button>

            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
              {newCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
              )}
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pt-3">
          <div className="relative">
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

      {/* ── Main ── */}
      <main className="container mx-auto p-4 md:p-6 lg:p-8 flex-1">

        {/* New leads alert banner */}
        {newCount > 0 && (
          <div className="mb-6 bg-slate-900 rounded-lg p-4 flex items-center justify-between shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <div className="flex items-center gap-4 z-10">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Morning alert</h3>
                <p className="text-gray-400 text-sm">
                  {newCount} new{" "}
                  {newCount === 1 ? "opportunity" : "opportunities"} in the
                  last 24 hours.
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

          {/* ── Left: Lead list ── */}
          <div className="w-full lg:w-2/3 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Today's Opportunities
              </h2>
              <p className="text-xs text-gray-500">
                Click a portal to filter • Click{" "}
                <RefreshCw className="inline w-3 h-3" /> to scout • Click a
                row to preview
              </p>
            </div>

            {/* Portal pills */}
            <div className="flex flex-wrap gap-2">
              {PORTALS_LIST.map((portal) => {
                const isActive = activePortalFilter === portal.id;
                const isScouting = scoutingPortal === portal.id;
                const count = leadsCountByPortal[portal.id] ?? 0;

                return (
                  <div
                    key={portal.id}
                    onClick={() => handlePortalFilter(portal.id)}
                    className={clsx(
                      "relative group flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all select-none",
                      isActive
                        ? "bg-slate-800 border-slate-600 text-white shadow ring-2 ring-indigo-500/30"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-2 h-2 rounded-full shrink-0",
                        portal.color
                      )}
                    />
                    <span className="text-xs font-bold">{portal.shortCode}</span>

                    {/* Lead count badge */}
                    {count > 0 && (
                      <span
                        className={clsx(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {count}
                      </span>
                    )}

                    {/* Scout button */}
                    <button
                      onClick={(e) =>
                        handlePortalScout(portal.id, portal.name, e)
                      }
                      disabled={!!scoutingPortal}
                      title={`Scout ${portal.name} for new leads`}
                      className={clsx(
                        "ml-0.5 rounded-full p-0.5 transition-all",
                        isScouting
                          ? "text-indigo-400"
                          : "text-gray-300 group-hover:text-indigo-400 hover:bg-indigo-50"
                      )}
                    >
                      {isScouting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}

              {activePortalFilter && (
                <button
                  onClick={() => setActivePortalFilter(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2"
                >
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
            </div>

            {/* Table header */}
            <div className="hidden md:flex px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 rounded-t-lg border-b border-gray-100">
              <div className="flex-1 pl-2">Company / Plot</div>
              <div className="w-24">Acreage</div>
              <div className="w-24">Date</div>
              <div className="w-28">Sector</div>
              <div className="w-32">Portal</div>
              <div className="w-24 text-right pr-2">Actions</div>
            </div>

            {/* Lead rows */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-lg border border-dashed border-gray-300 space-y-3">
                  <p className="text-gray-500 font-medium">
                    No leads found matching criteria.
                  </p>
                  <p className="text-xs text-gray-400">
                    {activePortalFilter
                      ? `Click the ↻ icon on the ${activePortalFilter} pill to scout for live data.`
                      : "Select a portal and click ↻ to start scouting live allotment data."}
                  </p>
                  {activePortalFilter && (() => {
                    const portal = PORTALS_LIST.find(
                      (p) => p.id === activePortalFilter
                    );
                    return portal ? (
                      <button
                        onClick={(e) =>
                          handlePortalScout(
                            portal.id,
                            portal.name,
                            e as React.MouseEvent
                          )
                        }
                        disabled={!!scoutingPortal}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all"
                      >
                        {scoutingPortal === portal.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Scout {portal.name} Now
                      </button>
                    ) : null;
                  })()}
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

                  {/* Pagination */}
                  {filteredLeads.length > itemsPerPage && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 px-2">
                      <p className="text-xs text-gray-500">
                        Showing{" "}
                        <span className="font-medium text-gray-700">
                          {(currentPage - 1) * itemsPerPage + 1}–
                          {Math.min(
                            currentPage * itemsPerPage,
                            filteredLeads.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-gray-700">
                          {filteredLeads.length}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-gray-600 min-w-[3.5rem] text-center bg-gray-50 py-1 rounded">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* ── Right: Lead preview ── */}
          <div className="w-full lg:w-1/3 hidden lg:block">
            <LeadPreview lead={selectedLead} />
          </div>
        </div>
      </main>

      {/* ── Email Modal ── */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-gray-200">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" /> Draft Email
              </h3>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-white flex-1">
              {emailLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75" />
                    <div className="relative bg-indigo-50 p-3 rounded-full">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 animate-pulse">
                    Drafting with Gemini…
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
                      className="w-full pl-20 pr-3 py-2 border-b border-gray-200 text-gray-800 focus:outline-none font-medium text-sm"
                    />
                  </div>
                  <textarea
                    readOnly
                    value={emailDraft.body}
                    className="w-full h-80 p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none resize-none text-sm leading-relaxed"
                  />
                </div>
              ) : (
                <div className="text-red-500 flex items-center gap-2 justify-center h-full">
                  <X className="w-5 h-5" /> Failed to load draft.
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Paperclip className="w-3.5 h-3.5" /> Attach file
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
                    if (emailDraft) {
                      navigator.clipboard.writeText(
                        `${emailDraft.subject}\n\n${emailDraft.body}`
                      );
                      toast.success("Copied to clipboard!");
                    }
                  }}
                  disabled={!emailDraft}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm shadow-sm transition-all"
                >
                  Copy &amp; Close
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
