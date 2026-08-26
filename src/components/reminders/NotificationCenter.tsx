import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { Invoice } from '../../types/invoice';
import { getDaysDifference, determineReminderTemplate } from '../../utils/reminderService';
import { NavigationTab } from '../layout/Sidebar';

interface NotificationCenterProps {
  onSelectInvoiceForReminder: (invoice: Invoice) => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onSelectInvoiceForReminder,
  onNavigateToTab,
}) => {
  const { attentionSummary, sendBulkReminders, activeCurrency } = useInvoice();
  const [isOpen, setIsOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalCount = attentionSummary.allAttentionInvoices.length;
  const overdueCount = attentionSummary.overdueInvoices.length;
  const dueTodayCount = attentionSummary.dueTodayInvoices.length;
  const approachingCount = attentionSummary.approachingInvoices.length;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSendAllOverdue = async () => {
    if (attentionSummary.overdueInvoices.length === 0) return;
    setBulkSending(true);
    const ids = attentionSummary.overdueInvoices.map((i) => i.id);
    const count = await sendBulkReminders(ids);
    setBulkSending(false);
    setBulkSuccessMsg(`Dispatched automated reminders to ${count} overdue client(s)!`);
    setTimeout(() => setBulkSuccessMsg(null), 3500);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer"
        title="Payment Reminder Alerts"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span
            className={`absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-xs ${
              overdueCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
            }`}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 max-w-sm sm:max-w-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 mx-auto sm:mx-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-orange-500" />
                Payment Alerts
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                {totalCount} Actionable
              </span>
            </div>

            {onNavigateToTab && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToTab('reminders' as NavigationTab);
                }}
                className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
              >
                <span>Automations Hub</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="px-4 py-2.5 bg-zinc-100/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-red-500 font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                {overdueCount} Overdue
              </span>
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Clock className="w-3.5 h-3.5" />
                {dueTodayCount + approachingCount} Due Soon
              </span>
            </div>
            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
              {activeCurrency.symbol} {attentionSummary.totalAttentionAmount.toLocaleString()}
            </span>
          </div>

          {/* Bulk Notification Success Toast */}
          {bulkSuccessMsg && (
            <div className="p-3 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Alert Invoices List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {totalCount === 0 ? (
              <div className="py-8 text-center px-4 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  All Invoices In Good Standing!
                </p>
                <p className="text-[11px] text-zinc-500">
                  No pending invoices approaching or past their due dates.
                </p>
              </div>
            ) : (
              attentionSummary.allAttentionInvoices.map((inv) => {
                const diff = getDaysDifference(inv.dueDate);
                const isOverdue = diff > 0;
                const isToday = diff === 0;

                return (
                  <div
                    key={inv.id}
                    className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          #{inv.invoiceNumber}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            isOverdue
                              ? 'bg-red-500/15 text-red-500'
                              : isToday
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-orange-500/15 text-orange-500'
                          }`}
                        >
                          {isOverdue ? `${diff}d Overdue` : isToday ? 'Due Today' : `In ${Math.abs(diff)}d`}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {inv.client.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {inv.currency.symbol} {inv.totalAmount.toLocaleString()} • Due: {inv.dueDate}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onSelectInvoiceForReminder(inv);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white dark:text-orange-400 dark:hover:text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>Remind</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          {overdueCount > 0 && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 flex items-center justify-between">
              <button
                type="button"
                disabled={bulkSending}
                onClick={handleSendAllOverdue}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{bulkSending ? 'Sending...' : `Send Reminders to All ${overdueCount} Overdue`}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
