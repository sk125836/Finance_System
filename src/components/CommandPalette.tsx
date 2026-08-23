import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Receipt,
  Users,
  BarChart3,
  FileSpreadsheet,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useInvoice } from '../context/InvoiceContext';
import { useTheme } from '../context/ThemeContext';
import { NavigationTab } from './layout/Sidebar';
import { Invoice } from '../types/invoice';

interface CommandPaletteProps {
  setActiveTab: (tab: NavigationTab) => void;
  onSelectInvoice?: (invoice: Invoice) => void;
  onOpenCreate?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  setActiveTab,
  onSelectInvoice,
  onOpenCreate,
}) => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    invoices,
    clients,
    setFilters,
    exportToCSV,
    exportToExcelData,
  } = useInvoice();

  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown handler for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  // Search Results
  const matchedInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(cleanQuery) ||
      inv.client.name.toLowerCase().includes(cleanQuery) ||
      inv.totalAmount.toString().includes(cleanQuery) ||
      inv.status.toLowerCase().includes(cleanQuery) ||
      inv.items.some((i) => i.description.toLowerCase().includes(cleanQuery))
  ).slice(0, 5);

  const matchedClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(cleanQuery) ||
      (c.company && c.company.toLowerCase().includes(cleanQuery)) ||
      c.phone.includes(cleanQuery)
  ).slice(0, 4);

  const actions = [
    {
      id: 'create-invoice',
      title: 'Create New Invoice',
      subtitle: 'Open fast invoice generator',
      icon: Plus,
      color: 'text-orange-500 bg-orange-500/10',
      action: () => {
        if (onOpenCreate) onOpenCreate();
        setActiveTab('create');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-paid',
      title: 'Filter: Paid Invoices',
      subtitle: 'View all settled bills',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10',
      action: () => {
        setFilters((prev) => ({ ...prev, status: 'paid', searchQuery: '' }));
        setActiveTab('invoices');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-pending',
      title: 'Filter: Pending & Due Bills',
      subtitle: 'Review awaiting payments',
      icon: Clock,
      color: 'text-amber-500 bg-amber-500/10',
      action: () => {
        setFilters((prev) => ({ ...prev, status: 'pending', searchQuery: '' }));
        setActiveTab('invoices');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-overdue',
      title: 'Filter: Overdue Invoices',
      subtitle: 'Urgent payment collections',
      icon: AlertTriangle,
      color: 'text-red-500 bg-red-500/10',
      action: () => {
        setFilters((prev) => ({ ...prev, status: 'overdue', searchQuery: '' }));
        setActiveTab('invoices');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'export-csv',
      title: 'Export Billing Data (CSV)',
      subtitle: 'Download complete dataset as CSV spreadsheet',
      icon: FileSpreadsheet,
      color: 'text-blue-500 bg-blue-500/10',
      action: () => {
        exportToCSV();
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'export-excel',
      title: 'Export Billing Ledger (Excel .xls)',
      subtitle: 'Download formatted Excel sheet',
      icon: FileSpreadsheet,
      color: 'text-emerald-500 bg-emerald-500/10',
      action: () => {
        exportToExcelData();
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-reminders',
      title: 'Automated Payment Reminders & Alerts',
      subtitle: 'Send reminder emails, WhatsApp notes & review overdue queue',
      icon: Clock,
      color: 'text-orange-500 bg-orange-500/10',
      action: () => {
        setActiveTab('reminders');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-reports',
      title: 'Automated Financial Reports & Charts',
      subtitle: 'Revenue trends, breakdown & analytics',
      icon: BarChart3,
      color: 'text-purple-500 bg-purple-500/10',
      action: () => {
        setActiveTab('reports');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'toggle-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle dashboard appearance',
      icon: theme === 'dark' ? Sun : Moon,
      color: 'text-amber-400 bg-amber-400/10',
      action: () => {
        toggleTheme();
        setIsCommandPaletteOpen(false);
      },
    },
  ];

  const filteredActions = cleanQuery
    ? actions.filter(
        (a) =>
          a.title.toLowerCase().includes(cleanQuery) ||
          a.subtitle.toLowerCase().includes(cleanQuery)
      )
    : actions;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, vendor name, or invoice # (e.g. Apex, 001, Paid)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-base"
          />
          <kbd className="px-2 py-1 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded border border-zinc-300 dark:border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* Matched Invoices */}
          {matchedInvoices.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Invoices & Bills</span>
                <Receipt className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="mt-1 space-y-1">
                {matchedInvoices.map((inv) => {
                  const statusColors: Record<string, string> = {
                    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                    draft: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
                  };

                  return (
                    <button
                      key={inv.id}
                      onClick={() => {
                        if (onSelectInvoice) onSelectInvoice(inv);
                        setActiveTab('invoices');
                        setIsCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-zinc-800/80 transition text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
                          {inv.currency.symbol}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>{inv.invoiceNumber}</span>
                            <span className="text-zinc-400 text-xs font-normal">•</span>
                            <span className="text-zinc-700 dark:text-zinc-300">{inv.client.name}</span>
                          </div>
                          <div className="text-xs text-zinc-400">
                            Issued: {inv.issueDate} • Due: {inv.dueDate}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {inv.currency.symbol} {inv.totalAmount.toLocaleString()}
                          </div>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                              statusColors[inv.status] || ''
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Clients */}
          {matchedClients.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Clients & Vendors</span>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="mt-1 space-y-1">
                {matchedClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, vendorId: c.id, searchQuery: '' }));
                      setActiveTab('invoices');
                      setIsCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {c.name}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {c.company || c.phone || c.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                      <span>View Bills</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Quick Actions</span>
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="mt-1 space-y-1">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            {action.title}
                          </div>
                          <div className="text-xs text-zinc-400">{action.subtitle}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchedInvoices.length === 0 && matchedClients.length === 0 && filteredActions.length === 0 && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">No results found for "{query}".</p>
              <p className="text-xs text-zinc-500 mt-1">Try searching by client name, invoice number, or amount.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">↑</kbd> <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">ESC</kbd> to close
            </span>
          </div>
          <span className="font-semibold text-orange-500">Zoolyum Instant Hub</span>
        </div>
      </div>
    </div>
  );
};
