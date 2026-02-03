import React, { useState } from 'react';
import { Lead } from '../types';
import { format } from 'date-fns';
import { LayoutDashboard, Microscope, User, Loader2, Building2 } from 'lucide-react';
import { deepResearchLead } from '../services/api';
import toast from 'react-hot-toast';

interface LeadPreviewProps {
  lead: Lead | null;
}

const LeadPreview: React.FC<LeadPreviewProps> = ({ lead }) => {
  const [researching, setResearching] = useState(false);

  // When lead changes, reset researching state locally if needed,
  // but lead.decisionMakers comes from props (Firestore), so we rely on that.

  const handleResearch = async () => {
    if (!lead) return;
    setResearching(true);
    try {
        await deepResearchLead(lead);
        toast.success("Research complete. Decision makers found.");
    } catch (e) {
        toast.error("Deep research failed.");
    } finally {
        setResearching(false);
    }
  };

  if (!lead) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <LayoutDashboard className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-gray-900 font-medium">No lead selected</h3>
        <p className="text-gray-500 text-sm mt-1">Select a row to view details and AI insights.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Lead Preview</h2>
        <p className="text-xs text-gray-400">Context for quick calling</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Header Info */}
        <div>
           <div className="flex items-center gap-2 mb-2">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{lead.companyName || 'Unknown Company'}</h1>
           </div>
           <div className="flex flex-wrap gap-2">
             <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">New</span>
             {lead.sector && (
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{lead.sector}</span>
             )}
           </div>
        </div>

        {/* Company Snapshot Summary */}
        {lead.summary && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Company Snapshot</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                    {lead.summary}
                </p>
            </div>
        )}

        {/* Data Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Plot No</div>
                <div className="font-semibold text-gray-900 text-sm truncate" title={lead.plotNo || ''}>{lead.plotNo || '-'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Acreage</div>
                <div className="font-semibold text-gray-900 text-sm">{lead.acreage ? `${lead.acreage} acres` : '-'}</div>
            </div>
             <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Allotment Date</div>
                <div className="font-semibold text-gray-900 text-sm">{lead.date ? format(new Date(lead.date), 'yyyy-MM-dd') : '-'}</div>
            </div>
             <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Portal</div>
                <div className="font-semibold text-gray-900 text-sm truncate">{lead.portalId}</div>
            </div>
        </div>
        
        {/* Deep Research Section */}
        <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                    <User className="w-4 h-4" /> Decision Makers
                </h3>
                {(!lead.decisionMakers || lead.decisionMakers.length === 0) && (
                    <button 
                        onClick={handleResearch} 
                        disabled={researching}
                        className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 transition-all"
                    >
                        {researching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Microscope className="w-3 h-3" />}
                        {researching ? 'Hunting...' : 'Deep Research'}
                    </button>
                )}
            </div>

            {lead.decisionMakers && lead.decisionMakers.length > 0 ? (
                <div className="space-y-3">
                    {lead.decisionMakers.map((dm, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-indigo-100 shadow-sm text-sm">
                            <div className="font-bold text-gray-800">{dm.name}</div>
                            <div className="text-xs text-gray-500">{dm.role}</div>
                            {dm.contact && <div className="text-xs text-indigo-600 mt-1">{dm.contact}</div>}
                            {dm.email && <div className="text-xs text-gray-600">{dm.email}</div>}
                        </div>
                    ))}
                    <div className="text-[10px] text-center text-gray-400 mt-2">Verified via Google Search</div>
                </div>
            ) : (
                <p className="text-xs text-gray-500 italic">
                    {researching ? "Scanning corporate registries & LinkedIn..." : "Run deep research to find Directors & Contact numbers."}
                </p>
            )}
        </div>

        {/* Talk Track */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Suggested talk track</h3>
            <ul className="space-y-2">
                <li className="flex gap-2 text-sm text-slate-600">
                    <span className="text-indigo-500">•</span>
                    <span>Congrats on the new land allotment in {lead.portalId?.split('_')[1] || 'the industrial park'}.</span>
                </li>
                <li className="flex gap-2 text-sm text-slate-600">
                    <span className="text-indigo-500">•</span>
                    <span>Confirm timeline for commissioning & ground breaking.</span>
                </li>
                <li className="flex gap-2 text-sm text-slate-600">
                    <span className="text-indigo-500">•</span>
                    <span>Offer EPC scope: civil, utilities, approvals, execution plan.</span>
                </li>
            </ul>
        </div>
        
        {/* Basic Contact info if available (Fallback) */}
        {(lead.contactEmail || lead.contactPhone) && (!lead.decisionMakers || lead.decisionMakers.length === 0) && (
            <div className="pt-4 border-t border-gray-100">
                 <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">General Contact</h3>
                 <div className="space-y-2">
                    {lead.contactEmail && (
                         <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {lead.contactEmail}
                         </div>
                    )}
                    {lead.contactPhone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {lead.contactPhone}
                        </div>
                    )}
                 </div>
            </div>
        )}

      </div>
    </div>
  )
}

export default LeadPreview;