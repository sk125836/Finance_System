import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  Edit,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  FileSpreadsheet,
  X,
  Calendar,
  Layers,
  Sparkles,
  Mail,
  Send,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { formatCurrency, exportElementToPDF } from '../../utils/pdfGenerator';

interface InvoiceListProps {
  onSelectInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onOpenCreate: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onSelectInvoice,
  onEditInvoice,
  onOpenCreate,
}) => {
  const {
    filteredInvoices,
    filters,
    setFilters,
    resetFilters,
    clients,
    updateInvoiceStatus,
    deleteInvoice,
    duplicateInvoice,
    exportToCSV,
    exportToExcelData,
    setSelectedInvoiceForReminder,
  } = useInvoice();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // Pagination calculation
  const totalItems = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page is in bounds
  const validPage = Math.min(currentPage, totalPages);

  const paginatedInvoices = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, validPage, itemsPerPage]);

  // Bulk selection toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedInvoices.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkMarkPaid = () => {
    selectedIds.forEach((id) => updateInvoiceStatus(id, 'paid'));
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteInvoice(id));
    setSelectedIds([]);
  };

  const handleExportSelected = () => {
    const selected = filteredInvoices.filter((inv) => selectedIds.includes(inv.id));
    exportToCSV(selected.length > 0 ? selected : filteredInvoices);
  };

  // Filtered Summary Total Calculation
  const filteredTotalBilled = filteredInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const filteredTotalPaid = filteredInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const filteredTotalDue = filteredInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

  const statusBadgeColors: Record<string, string> = {
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    draft: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Invoice Ledger & History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Search, filter by vendor or status, track payments, and export to spreadsheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCSV()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-orange-500" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={() => exportToExcelData()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel (.xls)</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Vendor Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Vendor Specific Search */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Vendor / Client
            </label>
            <select
              value={filters.vendorId}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, vendorId: e.target.value }));
                setCurrentPage(1);
              }}
              aria-label="Filter by Vendor"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Vendors ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value as any }));
                setCurrentPage(1);
              }}
              aria-label="Filter by Payment Status"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="paid">✓ Paid</option>
              <option value="pending">● Pending</option>
              <option value="overdue">! Overdue</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Date Period
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, dateRange: e.target.value as any }));
                setCurrentPage(1);
              }}
              aria-label="Filter by Date Period"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this-week">This Week (Last 7 Days)</option>
              <option value="this-month">This Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year (2026)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Sort Records
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }));
                setCurrentPage(1);
              }}
              aria-label="Sort Records"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="date-desc">Date: Newest First</option>
              <option value="date-asc">Date: Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
              <option value="vendor-asc">Vendor Name (A-Z)</option>
              <option value="number-desc">Invoice # (Desc)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Bar */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-300">
            <span>
              Showing <b className="text-orange-500">{filteredInvoices.length}</b> matches
            </span>
            <span>•</span>
            <span>
              Filtered Sum: <b className="text-zinc-900 dark:text-white">৳ {filteredTotalBilled.toLocaleString()}</b>
            </span>
            <span>•</span>
            <span>
              Paid: <b className="text-emerald-500">৳ {filteredTotalPaid.toLocaleString()}</b>
            </span>
            <span>•</span>
            <span>
              Due: <b className="text-red-500">৳ {filteredTotalDue.toLocaleString()}</b>
            </span>
          </div>

          {(filters.searchQuery || filters.status !== 'all' || filters.vendorId !== 'all' || filters.dateRange !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Banner (when items selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
            {selectedIds.length} invoice(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkMarkPaid}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer"
            >
              Mark Paid
            </button>
            <button
              onClick={handleExportSelected}
              className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition cursor-pointer"
            >
              Export Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/70 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === paginatedInvoices.length}
                    onChange={handleSelectAll}
                    aria-label="Select all invoices on this page"
                    className="rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Client / Vendor</th>
                <th className="py-3.5 px-4">Issue / Due Date</th>
                <th className="py-3.5 px-4 text-right">Bill Total</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70">
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition group ${
                        isSelected ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                          className="rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>

                      <td
                        className="py-3.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400 cursor-pointer"
                        onClick={() => onSelectInvoice(inv)}
                      >
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => onSelectInvoice(inv)}>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {inv.client.name}
                        </div>
                        {inv.client.company && (
                          <div className="text-[11px] text-zinc-400">{inv.client.company}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                        <div>Issued: {inv.issueDate}</div>
                        <div className="opacity-75">Due: {inv.dueDate}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {inv.currency.symbol} {inv.totalAmount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {inv.balanceDue > 0 ? (
                          <span className="text-red-500">
                            {inv.currency.symbol} {inv.balanceDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-500">Settled (0)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as InvoiceStatus)}
                          aria-label={`Change status for invoice ${inv.invoiceNumber}`}
                          className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                            statusBadgeColors[inv.status] || ''
                          }`}
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                          <option value="draft">Draft</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => setSelectedInvoiceForReminder(inv)}
                              className="p-1.5 rounded-lg text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-500 hover:text-white dark:hover:text-white transition cursor-pointer"
                              title="Send Payment Reminder"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onSelectInvoice(inv)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition cursor-pointer"
                            title="View / Print PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditInvoice(inv)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
                            title="Edit Invoice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => duplicateInvoice(inv.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition"
                            title="Duplicate Bill"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setShowDeleteModal(inv.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <FileText className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                    <p className="text-sm font-semibold">No invoices match your current search.</p>
                    <p className="text-xs text-zinc-500 mt-1">Try resetting the filters or create a new invoice.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-zinc-500">
            <span>
              Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalItems === 0 ? 0 : (validPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.min(validPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalItems}</span> records
            </span>

            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Items per page"
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validPage <= 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage <= 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-orange-500">
              Page {validPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Delete Invoice
            </h3>
            <p className="text-xs text-zinc-500">
              Are you sure you want to delete this invoice record from the history? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteInvoice(showDeleteModal);
                  setShowDeleteModal(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
