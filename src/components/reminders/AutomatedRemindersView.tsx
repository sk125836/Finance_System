import React, { useState } from 'react';
import {
  Bell,
  Mail,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Settings,
  Sparkles,
  Search,
  Filter,
  Check,
  ShieldAlert,
  ArrowUpRight,
  MessageSquare,
  History,
  TrendingUp,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { Invoice, ReminderLog } from '../../types/invoice';
import { getDaysDifference, determineReminderTemplate } from '../../utils/reminderService';

interface AutomatedRemindersViewProps {
  onOpenReminderModal: (invoice: Invoice) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const AutomatedRemindersView: React.FC<AutomatedRemindersViewProps> = ({
  onOpenReminderModal,
  onSelectInvoice,
}) => {
  const {
    invoices,
    attentionSummary,
    automationSettings,
    updateAutomationSettings,
    sendBulkReminders,
    activeCurrency,
    companyProfile,
  } = useInvoice();

  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'settings'>('queue');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkSuccessToast, setBulkSuccessToast] = useState<string | null>(null);

  // Settings form local state
  const [alertBeforeDays, setAlertBeforeDays] = useState(automationSettings.alertBeforeDays);
  const [alertOnDueDate, setAlertOnDueDate] = useState(automationSettings.alertOnDueDate);
  const [senderName, setSenderName] = useState(automationSettings.senderName);
  const [senderEmail, setSenderEmail] = useState(automationSettings.senderEmail);
  const [ccEmail, setCcEmail] = useState(automationSettings.ccEmail || '');
  const [enableWhatsApp, setEnableWhatsApp] = useState(automationSettings.enableWhatsAppQuickLinks);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // All historical reminders across all invoices
  const allReminderLogs: { invoice: Invoice; log: ReminderLog }[] = [];
  invoices.forEach((inv) => {
    if (inv.remindersSent && inv.remindersSent.length > 0) {
      inv.remindersSent.forEach((log) => {
        allReminderLogs.push({ invoice: inv, log });
      });
    }
  });

  allReminderLogs.sort(
    (a, b) => new Date(b.log.sentAt).getTime() - new Date(a.log.sentAt).getTime()
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedInvoiceIds(attentionSummary.allAttentionInvoices.map((i) => i.id));
    } else {
      setSelectedInvoiceIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSendSelectedBulk = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setIsBulkSending(true);
    const count = await sendBulkReminders(selectedInvoiceIds);
    setIsBulkSending(false);
    setSelectedInvoiceIds([]);
    setBulkSuccessToast(`Successfully dispatched automated reminders to ${count} invoice(s)!`);
    setTimeout(() => setBulkSuccessToast(null), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAutomationSettings({
      alertBeforeDays,
      alertOnDueDate,
      senderName,
      senderEmail,
      ccEmail,
      enableWhatsAppQuickLinks: enableWhatsApp,
    });
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" />
              <span>Automated Accounts Receivable & Notification Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Payment Reminders & Automation
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl">
              Proactively alert clients for invoices approaching their due dates, dispatch urgent notices for past-due balances, and track automated email reminder logs.
            </p>
          </div>

          {/* Quick Bulk Action Button */}
          {attentionSummary.overdueInvoices.length > 0 && (
            <div className="shrink-0">
              <button
                type="button"
                disabled={isBulkSending}
                onClick={() => {
                  setSelectedInvoiceIds(attentionSummary.overdueInvoices.map((i) => i.id));
                  handleSendSelectedBulk();
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-orange-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isBulkSending ? 'Dispatching...' : `Remind All ${attentionSummary.overdueInvoices.length} Overdue Clients`}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Overdue at Risk
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-mono font-black text-red-600 dark:text-red-400">
              {activeCurrency.symbol} {attentionSummary.totalOverdueAmount.toLocaleString()}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {attentionSummary.overdueInvoices.length} invoices past payment deadline
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Approaching Due Date
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-mono font-black text-amber-600 dark:text-amber-400">
              {attentionSummary.dueTodayInvoices.length + attentionSummary.approachingInvoices.length} Invoices
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Due within {automationSettings.alertBeforeDays} days or today
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Reminders Dispatched
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-mono font-black text-zinc-900 dark:text-zinc-100">
              {allReminderLogs.length}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Audit trail logged across all clients
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Automation Rules
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>Active</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 font-mono">Daily</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Alerts 3d before, on due date & overdue
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Action Queue ({attentionSummary.allAttentionInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sent History Log ({allReminderLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Automation Rules</span>
          </button>
        </div>

        {/* Selected Batch Counter */}
        {activeTab === 'queue' && selectedInvoiceIds.length > 0 && (
          <button
            type="button"
            onClick={handleSendSelectedBulk}
            disabled={isBulkSending}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Selected ({selectedInvoiceIds.length})</span>
          </button>
        )}
      </div>

      {/* Success Toast */}
      {bulkSuccessToast && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{bulkSuccessToast}</span>
        </div>
      )}

      {/* TAB CONTENT: ACTION QUEUE */}
      {activeTab === 'queue' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Invoices Requiring Payment Follow-up</span>
            </h3>
            <span className="text-xs text-zinc-500">
              Showing {attentionSummary.allAttentionInvoices.length} invoices
            </span>
          </div>

          {attentionSummary.allAttentionInvoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                All Invoices Are Up To Date!
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No invoices are approaching their due date or past due. You are all set!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] bg-zinc-50/50 dark:bg-zinc-950/20">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedInvoiceIds.length === attentionSummary.allAttentionInvoices.length &&
                          attentionSummary.allAttentionInvoices.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                    </th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Client / Vendor</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status & Urgency</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4">Last Reminded</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {attentionSummary.allAttentionInvoices.map((inv) => {
                    const diff = getDaysDifference(inv.dueDate);
                    const isOverdue = diff > 0;
                    const isToday = diff === 0;
                    const { label, urgency } = determineReminderTemplate(inv);
                    const isSelected = selectedInvoiceIds.includes(inv.id);

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition ${
                          isSelected ? 'bg-orange-500/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(inv.id)}
                            className="rounded text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(inv)}
                            className="hover:text-orange-500 hover:underline"
                          >
                            #{inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {inv.client.name}
                          </div>
                          <div className="text-[11px] text-zinc-500">{inv.client.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {inv.dueDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              urgency === 'critical'
                                ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                                : urgency === 'high'
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                : 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                            }`}
                          >
                            {isOverdue && <ShieldAlert className="w-3 h-3" />}
                            {label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {inv.currency.symbol} {inv.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                          {inv.lastReminderSentAt ? (
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">
                              {new Date(inv.lastReminderSentAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="italic text-zinc-400">Never reminded</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenReminderModal(inv)}
                            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 text-xs font-bold transition flex items-center gap-1.5 ml-auto shadow-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Remind</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SENT REMINDER HISTORY AUDIT */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <History className="w-4 h-4 text-orange-500" />
              <span>Full Company Payment Reminder Audit Trail</span>
            </h3>
            <span className="text-xs text-zinc-500">
              Total Recorded: {allReminderLogs.length}
            </span>
          </div>

          {allReminderLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Mail className="w-12 h-12 text-zinc-400 mx-auto opacity-50" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No Reminder History Yet
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Whenever you send or log a payment reminder email, WhatsApp note, or batch alert, the full history will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] bg-zinc-50/50 dark:bg-zinc-950/20">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Template Type</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {allReminderLogs.map(({ invoice, log }) => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{log.recipientName}</div>
                        <div className="text-[11px] text-zinc-500">{log.recipientEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200 max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: AUTOMATION SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-500" />
              <span>Automated Reminder Rules & Notifications</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Configure trigger thresholds, sender signatures, and communication channels.
            </p>
          </div>

          {settingsSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Automation settings successfully updated!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Trigger Rules
              </h4>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Days Before Due Date to Alert:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={alertBeforeDays}
                    onChange={(e) => setAlertBeforeDays(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-zinc-500">days prior to deadline (e.g. 3 days)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="alertOnDue"
                  checked={alertOnDueDate}
                  onChange={(e) => setAlertOnDueDate(e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="alertOnDue" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Send prompt alert on the exact Due Date
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableWa"
                  checked={enableWhatsApp}
                  onChange={(e) => setEnableWhatsApp(e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="enableWa" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Enable WhatsApp Direct Reminder links in Composer
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Sender & CC Details
              </h4>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Default Sender Name:
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sender Email:
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Auto-CC Accounting Email:
                </label>
                <input
                  type="email"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="finance@zoolyum.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Save Automation Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
