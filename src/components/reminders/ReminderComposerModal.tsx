import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  History,
  Calendar,
  DollarSign,
  User,
  Building,
} from 'lucide-react';
import { Invoice, ReminderLog } from '../../types/invoice';
import { useInvoice } from '../../context/InvoiceContext';
import {
  ReminderTemplateType,
  generateEmailContent,
  buildMailtoUrl,
  buildWhatsAppReminderUrl,
  determineReminderTemplate,
  getDaysDifference,
} from '../../utils/reminderService';

interface ReminderComposerModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ReminderComposerModal: React.FC<ReminderComposerModalProps> = ({
  invoice,
  onClose,
}) => {
  const { recordReminderSent, companyProfile, automationSettings } = useInvoice();

  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplateType>('approaching');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'composer' | 'history'>('composer');

  // Initialize data whenever invoice changes
  useEffect(() => {
    if (invoice) {
      const { templateType } = determineReminderTemplate(invoice);
      setSelectedTemplate(templateType);
      const generated = generateEmailContent(invoice, templateType);
      setRecipientEmail(invoice.client.email || '');
      setEmailSubject(generated.subject);
      setEmailBody(generated.body);
      setCcEmail(automationSettings.ccEmail || companyProfile.email || '');
      setSentSuccess(false);
    }
  }, [invoice, automationSettings, companyProfile]);

  // Update subject and body when template changes
  const handleTemplateChange = (type: ReminderTemplateType) => {
    if (!invoice) return;
    setSelectedTemplate(type);
    const generated = generateEmailContent(invoice, type);
    setEmailSubject(generated.subject);
    setEmailBody(generated.body);
  };

  if (!invoice) return null;

  const daysDiff = getDaysDifference(invoice.dueDate);
  const { urgency, label } = determineReminderTemplate(invoice);

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    const fullText = `Subject: ${emailSubject}\n\n${emailBody}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Handle Launching Native Email Client (mailto:)
  const handleOpenEmailClient = () => {
    const mailtoUrl = buildMailtoUrl(recipientEmail, emailSubject, emailBody, ccEmail);
    window.open(mailtoUrl, '_blank');

    // Automatically record into timeline
    recordReminderSent(invoice.id, {
      recipientEmail,
      recipientName: invoice.client.name,
      subject: emailSubject,
      type: selectedTemplate,
      channel: 'email',
      notes: `Email client opened with "${selectedTemplate}" template.`,
    });

    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  // Handle WhatsApp Reminder
  const handleOpenWhatsApp = () => {
    const waText = `*Payment Reminder from ${companyProfile.name || 'Zoolyum'}*\n\nDear ${invoice.client.name},\nThis is a reminder regarding Invoice *#${invoice.invoiceNumber}* for *${invoice.currency.symbol} ${invoice.totalAmount.toLocaleString()}* (Due Date: ${invoice.dueDate}).\n\nPayment via bKash/Nagad: ${companyProfile.defaultPaymentDetails.mobileWalletNumber || '01601000950'}\n\nPlease let us know once paid. Thank you!`;
    const waUrl = buildWhatsAppReminderUrl(invoice.client.phone || '', waText);
    window.open(waUrl, '_blank');

    recordReminderSent(invoice.id, {
      recipientEmail: invoice.client.email || 'N/A',
      recipientName: invoice.client.name,
      subject: `WhatsApp Reminder: #${invoice.invoiceNumber}`,
      type: selectedTemplate,
      channel: 'whatsapp',
      notes: `WhatsApp reminder dispatched to ${invoice.client.phone}.`,
    });

    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  // Handle Mark as Logged / Sent directly
  const handleDirectLogSent = () => {
    recordReminderSent(invoice.id, {
      recipientEmail,
      recipientName: invoice.client.name,
      subject: emailSubject,
      type: selectedTemplate,
      channel: 'system',
      notes: `Directly logged as dispatched payment reminder.`,
    });
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  const templates: { id: ReminderTemplateType; title: string; desc: string; badge: string }[] = [
    {
      id: 'approaching',
      title: 'Upcoming Reminder',
      desc: 'Polite reminder before due date',
      badge: 'Friendly',
    },
    {
      id: 'due_today',
      title: 'Due Today',
      desc: 'Alert for today’s deadline',
      badge: 'Due Today',
    },
    {
      id: 'overdue_1',
      title: '1st Overdue Notice',
      desc: '1-7 days past due',
      badge: 'Overdue',
    },
    {
      id: 'overdue_2',
      title: '2nd Urgent Notice',
      desc: '8-14 days past due',
      badge: 'Urgent',
    },
    {
      id: 'final_notice',
      title: 'Final Notice',
      desc: 'Critical escalation notice',
      badge: 'Critical',
    },
    {
      id: 'paid_receipt',
      title: 'Payment Receipt',
      desc: 'Settlement confirmation note',
      badge: 'Receipt',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                  Send Payment Reminder
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                  #{invoice.invoiceNumber}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    urgency === 'critical'
                      ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                      : urgency === 'high'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                  }`}
                >
                  {label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                To: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{invoice.client.name}</span> ({invoice.client.company || 'Direct Client'}) • Due: {invoice.dueDate} • Balance: {invoice.currency.symbol} {invoice.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-zinc-200 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('composer')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'composer'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Compose Email
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({invoice.remindersSent?.length || 0})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sentSuccess ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-white">
              Reminder Recorded & Dispatched!
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              Payment reminder for invoice #{invoice.invoiceNumber} has been logged to the audit history.
            </p>
          </div>
        ) : activeTab === 'history' ? (
          /* Reminder Logs & Audit Timeline */
          <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-orange-500" />
                <span>Reminder Audit Trail for #{invoice.invoiceNumber}</span>
              </h4>
              <span className="text-xs text-zinc-500">
                Total Dispatched: {invoice.remindersSent?.length || 0}
              </span>
            </div>

            {(!invoice.remindersSent || invoice.remindersSent.length === 0) ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <Mail className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  No reminders sent yet for this invoice.
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Use the composer tab to dispatch the first payment notification.
                </p>
                <button
                  onClick={() => setActiveTab('composer')}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition"
                >
                  Compose First Reminder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {invoice.remindersSent.map((log: ReminderLog, idx: number) => (
                  <div
                    key={log.id || idx}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {log.subject}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {log.channel}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {new Date(log.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-4">
                      <span>Recipient: <strong className="text-zinc-800 dark:text-zinc-200">{log.recipientEmail}</strong></span>
                      {log.notes && <span className="italic text-zinc-500">• {log.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Composer View */
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Template Selector Bar */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Choose Smart Template:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tpl.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{tpl.title}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">{tpl.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Recipient Email (Client):
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  CC Email:
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

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Subject Line:
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Email Message Body:
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Includes bank & bKash info automatically
                </span>
              </div>
              <textarea
                rows={10}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-orange-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Modal Bottom Footer Actions */}
        {!sentSuccess && activeTab === 'composer' && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>

              {invoice.client.phone && automationSettings.enableWhatsAppQuickLinks && (
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Reminder</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDirectLogSent}
                className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition"
              >
                Mark as Reminded
              </button>

              <button
                type="button"
                onClick={handleOpenEmailClient}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Open Email App & Send</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
