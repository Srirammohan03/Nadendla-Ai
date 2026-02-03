import React from 'react';
import { Lead } from '../types';
import { Mail, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface LeadRowProps {
  lead: Lead;
  isNew: boolean;
  isSelected: boolean;
  onSelect: (lead: Lead) => void;
  onDraftEmail: (lead: Lead) => void;
}

const LeadRow: React.FC<LeadRowProps> = ({ lead, isNew, isSelected, onSelect, onDraftEmail }) => {
  const timeAgo = lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt), { addSuffix: true }) : '';
  
  // Status check
  const isResearched = lead.status === 'researched' || lead.status === 'contacted';
  const isRead = isResearched; // We treat researched as "Read"

  return (
    <div 
        onClick={() => onSelect(lead)}
        className={clsx(
            "group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer relative",
            isSelected 
                ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200 z-10" 
                : isResearched
                    ? "bg-gray-100 border-gray-200 opacity-80" // Darker gray for researched
                    : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"
        )}
    >
        {/* Status indicator bar */}
        {/* If researched: Gray bar. If New & Unread: Green bar. */}
        {isResearched && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-400 rounded-l-lg"></div>}
        {isNew && !isResearched && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-lg"></div>}

        {/* Company & Meta */}
        <div className="flex-1 min-w-0 pl-3">
            <div className="flex items-center gap-2 mb-1">
                <h3 className={clsx("font-semibold truncate", isResearched ? "text-gray-600" : "text-gray-900")}>
                    {lead.companyName || 'Unknown Company'}
                </h3>
                {isNew && !isResearched && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">New</span>}
                {/* REMOVED TEXT BADGE FOR RESEARCHED */}
            </div>
            <div className="text-xs text-gray-400">{timeAgo}</div>
        </div>

        {/* Plot */}
        <div className="w-24 shrink-0 text-sm hidden md:block opacity-90">
            <div className="text-gray-400 text-[10px] uppercase">Plot</div>
            <div className="font-medium text-gray-700 truncate">{lead.plotNo || '—'}</div>
        </div>

        {/* Acreage */}
        <div className="w-20 shrink-0 text-sm hidden md:block opacity-90">
             <div className="text-gray-400 text-[10px] uppercase">Acreage</div>
             <div className="font-medium text-gray-700">{lead.acreage || '—'}</div>
        </div>

        {/* Date */}
        <div className="w-24 shrink-0 text-sm hidden lg:block opacity-90">
            <div className="text-gray-400 text-[10px] uppercase">Date</div>
            <div className="font-medium text-gray-700">{lead.date ? format(new Date(lead.date), 'yyyy-MM-dd') : '—'}</div>
        </div>

        {/* Sector */}
        <div className="w-28 shrink-0 text-sm hidden lg:block opacity-90">
            <div className="text-gray-400 text-[10px] uppercase">Sector</div>
            <div className="font-medium text-gray-700 truncate">{lead.sector || 'Unknown'}</div>
        </div>

        {/* Portal */}
        <div className="w-32 shrink-0 text-sm hidden xl:block opacity-90">
            <div className="text-gray-400 text-[10px] uppercase">Portal</div>
            <div className="font-medium text-gray-700 truncate text-xs" title={lead.portalId}>
                {lead.portalId}
            </div>
            <div className="text-[10px] text-gray-400 truncate">
                {lead.portalId.split('_')[0]}
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0 pl-2">
             <button
                onClick={(e) => { e.stopPropagation(); onDraftEmail(lead); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-md text-xs font-medium border border-gray-200 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Draft
              </button>
              <a
                href={lead.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-md text-xs font-medium border border-gray-200 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Source
              </a>
        </div>
    </div>
  );
};

export default LeadRow;