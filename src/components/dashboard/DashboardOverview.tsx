import React from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Download,
  Plus,
  ArrowUpRight,
  Sparkles,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  Users,
  ChevronRight,
  Bell,
  Send,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { NavigationTab } from '../layout/Sidebar';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { formatCurrency, exportElementToPDF } from '../../utils/pdfGenerator';
import { getDaysDifference, determineReminderTemplate } from '../../utils/reminderService';

interface DashboardOverviewProps {
  setActiveTab: (tab: NavigationTab) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenCreate: () => void;
  onEditInvoice: (invoice: Invoice) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  setActiveTab,
  onSelectInvoice,
  onOpenCreate,
  onEditInvoice,
}) => {
  const {
    metrics,
    invoices,
    expenses,
    clients,
    filters,
    setFilters,
    filteredInvoices,
    resetFilters,
    updateInvoiceStatus,
    exportToCSV,
    exportToExcelData,
    attentionSummary,
    setSelectedInvoiceForReminder,
    companyProfile,
    activeCurrency,
  } = useInvoice();

  // Status quick filter handler
  const handleStatusFilter = (status: InvoiceStatus | 'all') => {
    setFilters((prev) => ({ ...prev, status }));
  };

  // Vendor quick filter handler
  const handleVendorFilter = (vendorId: string) => {
    setFilters((prev) => ({ ...prev, vendorId }));
  };

  const isFilterActive = filters.status !== 'all' || (filters.vendorId && filters.vendorId !== 'all') || Boolean(filters.searchQuery);

  // Invoices to display: all matching filtered invoices (up to 8 on dashboard)
  const displayedInvoices = isFilterActive ? filteredInvoices : filteredInvoices.slice(0, 8);

  const selectedVendorObj = clients.find((c) => c.id === filters.vendorId);

  // Top clients by billing
  const sortedClients = [...clients]
    .sort((a, b) => (b.totalBilled || 0) - (a.totalBilled || 0))
    .slice(0, 4);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Welcome Banner matching Zoolyum Branding */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-5 sm:p-7 md:p-8 text-white shadow-xl">
        {/* Subtle orange ambient glow */}
        <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{companyProfile.tagline || 'Brand Strategy & Digital Innovation'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              {companyProfile.name || 'Zoolyum'} Financial & Billing Hub
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm md:text-base">
              Generate instant vendor invoices, manage payment ledgers, track receivables, log expenses, and monitor net profit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Invoice</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span>Expenses ({expenses.length})</span>
            </button>

            <button
              onClick={() => exportToCSV()}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated Payment Alert Notice Banner */}
      {attentionSummary.allAttentionInvoices.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {attentionSummary.overdueInvoices.length > 0
                    ? `Payment Action Required: ${attentionSummary.overdueInvoices.length} Overdue & ${attentionSummary.dueTodayInvoices.length + attentionSummary.approachingInvoices.length} Approaching Due Date`
                    : `${attentionSummary.allAttentionInvoices.length} Invoices Approaching Payment Due Date`}
                </h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Total <strong>{activeCurrency.symbol} {attentionSummary.totalAttentionAmount.toLocaleString()}</strong> in receivables requires follow-up. Send automated reminder emails with 1-click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('reminders')}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Open Reminders Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Invoiced */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Invoiced
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {activeCurrency.symbol} {metrics.totalInvoiced.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              <span className="font-semibold text-orange-500">{metrics.totalInvoicesCount}</span> total bills issued
            </div>
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div
          onClick={() => {
            handleStatusFilter('paid');
            setActiveTab('invoices');
          }}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Collected Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {activeCurrency.symbol} {metrics.totalPaid.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{metrics.collectionRate.toFixed(1)}% collected</span>
            </div>
          </div>
        </div>

        {/* Expenses Outflow */}
        <div
          onClick={() => setActiveTab('expenses')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-red-500/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
              {activeCurrency.symbol} {metrics.totalExpenses.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              <span className="font-semibold text-red-500">{metrics.expensesCount}</span> cost items logged
            </div>
          </div>
        </div>

        {/* Net Cash Profit */}
        <div
          onClick={() => setActiveTab('reports')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Net Cash Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${
              metrics.netProfit >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'
            }`}>
              {activeCurrency.symbol} {metrics.netProfit.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              <span>(Collected: {activeCurrency.symbol}{metrics.totalPaid.toLocaleString()} - Costs)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Search & Vendor Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Vendor Filter Dropdown */}
          <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
            <select
              value={filters.vendorId || 'all'}
              onChange={(e) => handleVendorFilter(e.target.value)}
              aria-label="Filter by Vendor"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">👥 All Clients & Vendors ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Status Buttons */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl overflow-x-auto max-w-full">
            {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusFilter(st)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition shrink-0 cursor-pointer ${
                  filters.status === st
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Reset Filter Button if active */}
          {isFilterActive && (
            <button
              onClick={() => resetFilters()}
              className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition flex items-center gap-1 cursor-pointer"
            >
              <span>✕ Reset</span>
            </button>
          )}
        </div>

        {/* View All & Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('invoices')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
          >
            <span>View All ({invoices.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Two Column Section: Recent Invoices Ledger & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left 8 Cols: Recent Invoices Table */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  {isFilterActive ? 'Filtered Invoices' : 'Recent Invoices & Bills'}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {displayedInvoices.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isFilterActive
                  ? `Showing results matching filter criteria`
                  : 'Latest billing activity and payment records'}
              </p>
            </div>

            <button
              onClick={() => setActiveTab('invoices')}
              className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer"
            >
              <span>All Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {displayedInvoices.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                {invoices.length === 0 ? (
                  <>
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      No invoices created yet
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                      Your account is ready! Create your first invoice or bill to see details here.
                    </p>
                    <button
                      onClick={onOpenCreate}
                      className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:bg-orange-600 transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Invoice</span>
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      No invoices match your filter
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                      Try changing your status button or selecting a different vendor to view bills.
                    </p>
                    <button
                      onClick={() => resetFilters()}
                      className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:bg-orange-600 transition cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Invoice #</th>
                    <th className="py-3 px-3 sm:px-4">Client / Vendor</th>
                    <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Date</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Amount</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium">
                  {displayedInvoices.map((inv) => {
                    const statusBadgeColors: Record<string, string> = {
                      paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                      pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                      overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                      draft: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
                    };

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition group cursor-pointer"
                        onClick={() => onSelectInvoice(inv)}
                      >
                        <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[130px] sm:max-w-none">
                            {inv.client.name}
                          </div>
                          {inv.client.company && (
                            <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate max-w-[130px] sm:max-w-[160px]">
                              {inv.client.company}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-zinc-500 text-[11px] whitespace-nowrap hidden sm:table-cell">
                          {inv.issueDate}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {inv.currency.symbol} {inv.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              statusBadgeColors[inv.status] || ''
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => setSelectedInvoiceForReminder(inv)}
                                className="px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white dark:hover:text-white transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Send Payment Reminder"
                              >
                                <Send className="w-3 h-3" />
                                <span className="hidden sm:inline">Remind</span>
                              </button>
                            )}
                            <button
                              onClick={() => onSelectInvoice(inv)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition cursor-pointer"
                              title="Preview Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Top Clients & Quick Report Insight */}
        <div className="lg:col-span-4 space-y-5">
          {/* Top Clients by Volume */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                <span>Top Clients & Vendors</span>
              </h3>
              <button
                onClick={() => setActiveTab('vendors')}
                className="text-xs font-semibold text-orange-500 hover:underline cursor-pointer"
              >
                All ({clients.length})
              </button>
            </div>

            <div className="space-y-2.5">
              {sortedClients.length === 0 ? (
                <div className="py-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  <p>No clients or vendors added yet.</p>
                  <button
                    onClick={() => setActiveTab('vendors')}
                    className="mt-2 text-xs font-semibold text-orange-500 hover:underline cursor-pointer"
                  >
                    + Add your first client
                  </button>
                </div>
              ) : (
                sortedClients.map((client, idx) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, vendorId: client.id }));
                      setActiveTab('invoices');
                    }}
                    className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-orange-50/50 dark:hover:bg-orange-500/10 border border-zinc-200 dark:border-zinc-700/80 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-orange-500/15 text-orange-500 font-black text-[11px] sm:text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[120px] sm:max-w-[140px]">
                          {client.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">{client.invoicesCount || 0} bills issued</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        {activeCurrency.symbol} {(client.totalBilled || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Automatic Report Quick Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-600/15 via-orange-500/10 to-amber-500/5 border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <Sparkles className="w-4 h-4" />
              <span>Financial Health Summary</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              {metrics.totalInvoicesCount === 0 && metrics.expensesCount === 0 ? (
                <span>No transactions recorded yet. Create an invoice or log business expenses to monitor net profit & metrics.</span>
              ) : (
                <>Your average invoice ticket is <span className="font-bold text-orange-500">{activeCurrency.symbol} {Math.round(metrics.avgInvoiceValue).toLocaleString()}</span>. Total logged expenses stand at <span className="font-bold text-red-500">{activeCurrency.symbol} {metrics.totalExpenses.toLocaleString()}</span>.</>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setActiveTab('expenses')}
                className="w-full py-2 px-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer text-center"
              >
                Manage Expenses
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className="w-full py-2 px-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition cursor-pointer text-center"
              >
                Executive Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
