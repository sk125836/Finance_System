import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Tag,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Layers,
  X,
  TrendingDown,
  TrendingUp,
  Receipt,
  PieChart,
  ArrowUpDown,
  Smartphone,
  Wallet,
  Landmark,
  Image as ImageIcon,
  ExternalLink,
  Info,
  Check,
  FileText,
  Printer,
  Loader2,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { Expense, ExpenseCategory, ExpenseFilterOptions } from '../../types/invoice';
import { EXPENSE_CATEGORIES } from '../../types/mockData';
import { exportElementToPDF, triggerPrint } from '../../utils/pdfGenerator';
import { ZoolyumLogo } from '../common/ZoolyumLogo';
import { AuthorizedSignatureDisplay } from '../common/AuthorizedSignatureDisplay';

interface ExpenseManagerProps {
  onOpenCreateInvoice?: () => void;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onOpenCreateInvoice }) => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    exportExpensesToCSV,
    exportExpensesToExcel,
    companyProfile,
    activeCurrency,
    metrics,
    convertAmount,
  } = useInvoice();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // PDF Export States
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedVoucherExpense, setSelectedVoucherExpense] = useState<Expense | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [viewingReceiptExpense, setViewingReceiptExpense] = useState<Expense | null>(null);

  // Form State for Add / Edit Expense
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('marketing');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPayee, setFormPayee] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<Expense['paymentMethod']>('bank');
  const [formStatus, setFormStatus] = useState<'paid' | 'pending'>('paid');
  const [formNotes, setFormNotes] = useState('');
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Quick helper to open modal for creation
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormCategory('marketing');
    setFormAmount(0);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPayee('');
    setFormPaymentMethod('bkash');
    setFormStatus('paid');
    setFormNotes('');
    setFormReceiptUrl('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Quick helper to open modal for editing
  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormCategory(expense.category);
    setFormAmount(expense.amount);
    setFormDate(expense.date);
    setFormPayee(expense.payeeVendor || '');
    setFormPaymentMethod(expense.paymentMethod);
    setFormStatus(expense.status);
    setFormNotes(expense.notes || '');
    setFormReceiptUrl(expense.receiptUrl || '');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Expense title/description is required.');
      return;
    }
    if (formAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        title: formTitle.trim(),
        category: formCategory,
        amount: Number(formAmount),
        date: formDate,
        payeeVendor: formPayee.trim(),
        paymentMethod: formPaymentMethod,
        status: formStatus,
        notes: formNotes.trim(),
        receiptUrl: formReceiptUrl.trim() || undefined,
      });
    } else {
      addExpense({
        title: formTitle.trim(),
        category: formCategory,
        amount: Number(formAmount),
        currency: activeCurrency,
        date: formDate,
        payeeVendor: formPayee.trim(),
        paymentMethod: formPaymentMethod,
        status: formStatus,
        notes: formNotes.trim(),
        receiptUrl: formReceiptUrl.trim() || undefined,
      });
    }

    setIsCreateModalOpen(false);
    setEditingExpense(null);
  };

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (exp) =>
          exp.title.toLowerCase().includes(q) ||
          (exp.payeeVendor && exp.payeeVendor.toLowerCase().includes(q)) ||
          (exp.notes && exp.notes.toLowerCase().includes(q)) ||
          exp.category.toLowerCase().includes(q) ||
          exp.amount.toString().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((exp) => exp.category === selectedCategory);
    }

    // Payment method filter
    if (selectedPaymentMethod !== 'all') {
      list = list.filter((exp) => exp.paymentMethod === selectedPaymentMethod);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      list = list.filter((exp) => exp.status === selectedStatus);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      list = list.filter((exp) => {
        const expDate = new Date(exp.date);
        if (dateRange === 'today') {
          return exp.date === todayStr;
        }
        if (dateRange === 'this-week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return expDate >= oneWeekAgo && expDate <= now;
        }
        if (dateRange === 'this-month') {
          return (
            expDate.getFullYear() === now.getFullYear() &&
            expDate.getMonth() === now.getMonth()
          );
        }
        if (dateRange === 'this-quarter') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const expQuarter = Math.floor(expDate.getMonth() / 3);
          return (
            expDate.getFullYear() === now.getFullYear() &&
            expQuarter === currentQuarter
          );
        }
        if (dateRange === 'this-year') {
          return expDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return list;
  }, [expenses, searchQuery, selectedCategory, selectedPaymentMethod, selectedStatus, dateRange, sortBy]);

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    expenses.forEach((exp) => {
      if (!map[exp.category]) {
        map[exp.category] = { total: 0, count: 0 };
      }
      const convertedVal = convertAmount(exp.amount, exp.currency?.code || 'BDT', activeCurrency.code);
      map[exp.category].total += convertedVal;
      map[exp.category].count += 1;
    });

    const totalAll = expenses.reduce(
      (acc, e) => acc + convertAmount(e.amount, e.currency?.code || 'BDT', activeCurrency.code),
      0
    ) || 1;

    return EXPENSE_CATEGORIES.map((cat) => {
      const data = map[cat.id] || { total: 0, count: 0 };
      const percent = Math.round((data.total / totalAll) * 100);
      return {
        ...cat,
        total: data.total,
        count: data.count,
        percent,
      };
    }).sort((a, b) => b.total - a.total);
  }, [expenses, activeCurrency, convertAmount]);

  const filteredTotal = filteredExpenses.reduce(
    (sum, e) => sum + convertAmount(e.amount, e.currency?.code || 'BDT', activeCurrency.code),
    0
  );
  const filteredPaid = filteredExpenses
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + convertAmount(e.amount, e.currency?.code || 'BDT', activeCurrency.code), 0);
  const filteredPending = filteredExpenses
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + convertAmount(e.amount, e.currency?.code || 'BDT', activeCurrency.code), 0);

  const getCategoryConfig = (catId: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.id === catId) || EXPENSE_CATEGORIES[0];
  };

  // PDF Export Handlers
  const handleDownloadExpensePDF = async () => {
    setIsExportingPDF(true);
    try {
      const safeName = (companyProfile.name || 'Zoolyum').replace(/\s+/g, '_');
      const filename = `${safeName}_Expense_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;
      await exportElementToPDF('expense-ledger-target', filename);
    } catch (err) {
      console.error('Failed to export Expense PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadVoucherPDF = async (expense: Expense) => {
    setSelectedVoucherExpense(expense);
    setIsExportingPDF(true);
    setTimeout(async () => {
      try {
        const safeName = (companyProfile.name || 'Zoolyum').replace(/\s+/g, '_');
        const filename = `${safeName}_Payment_Voucher_${expense.id}_${expense.date}.pdf`;
        await exportElementToPDF('expense-voucher-target', filename);
      } catch (err) {
        console.error('Failed to export voucher PDF:', err);
      } finally {
        setIsExportingPDF(false);
      }
    }, 150);
  };

  const getPaymentMethodBadge = (method: Expense['paymentMethod']) => {
    switch (method) {
      case 'bkash':
        return <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-[10px] border border-pink-500/20">bKash</span>;
      case 'nagad':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">Nagad</span>;
      case 'rocket':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">Rocket</span>;
      case 'bank':
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-500/20">Bank Transfer</span>;
      case 'card':
        return <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] border border-indigo-500/20">Credit Card</span>;
      case 'cash':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">Cash</span>;
      case 'cheque':
        return <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-bold text-[10px] border border-zinc-500/20">Cheque</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[10px]">{method}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-5 sm:p-7 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Outflow & Expenditure Ledger</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              {companyProfile.name || 'Zoolyum'} Expense & Cost Manager
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Log daily operational expenses, track marketing & software budgets, download verified PDF statements, and monitor net profit margins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Expense</span>
            </button>

            {/* PDF Statement Download Button */}
            <button
              onClick={handleDownloadExpensePDF}
              disabled={isExportingPDF || expenses.length === 0}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download Official Expense PDF Statement"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-white" />
                  <span>PDF Statement</span>
                </>
              )}
            </button>

            <button
              onClick={() => exportExpensesToCSV(filteredExpenses)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">CSV Export</span>
            </button>

            <button
              onClick={() => exportExpensesToExcel(filteredExpenses)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              title="Export to Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Excel Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Expenses Incurred */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-2">
            {activeCurrency.symbol} {metrics.totalExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <span>{expenses.length} logged expense items</span>
          </p>
        </div>

        {/* Total Paid Outflow */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Paid Outflow
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {activeCurrency.symbol} {metrics.totalPaidExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Settled business expenditure
          </p>
        </div>

        {/* Pending Payables */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Pending Payables
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {activeCurrency.symbol} {metrics.totalPendingExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Awaiting invoice verification
          </p>
        </div>

        {/* Net Realized Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Net Cash Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${
            metrics.netProfit >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-red-500'
          }`}>
            {activeCurrency.symbol} {metrics.netProfit.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Collected Revenue ({metrics.totalPaid.toLocaleString()}) - Paid Costs
          </p>
        </div>
      </div>

      {/* Category Breakdown Progress */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Expense Distribution by Category
            </h3>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Total: {activeCurrency.symbol} {metrics.totalExpenses.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {categoryStats.slice(0, 5).map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate pr-1">
                  {cat.label.split(' ')[0]}
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400 shrink-0">
                  {cat.percent}%
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-orange-500"
                  style={{ width: `${Math.max(4, cat.percent)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                {activeCurrency.symbol} {cat.total.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-2 relative">
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Search Expenses
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search title, payee, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none placeholder-zinc-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="paid">✓ Paid</option>
              <option value="pending">● Pending</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 text-zinc-500">
            <span>Showing <strong>{filteredExpenses.length}</strong> of {expenses.length} expenses</span>
            {(selectedCategory !== 'all' || selectedPaymentMethod !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedPaymentMethod('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                  setDateRange('all');
                }}
                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[11px]">Filtered Total:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {activeCurrency.symbol} {filteredTotal.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleDownloadExpensePDF}
              disabled={isExportingPDF || filteredExpenses.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-bold text-xs transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expenses Table & Responsive Mobile/Tablet Cards */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Desktop & Tablet Table View (hidden on small mobile, visible sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/70 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Expense / Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Payee / Merchant</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => {
                  const catConfig = getCategoryConfig(exp.category);
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition group"
                    >
                      <td className="py-3.5 px-4 text-zinc-500 text-[11px] whitespace-nowrap">
                        {exp.date}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {exp.title}
                        </div>
                        {exp.notes && (
                          <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${catConfig.bgLight}`}>
                          {catConfig.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 font-medium">
                        {exp.payeeVendor || '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPaymentMethodBadge(exp.paymentMethod)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-orange-600 dark:text-orange-400 whitespace-nowrap font-mono">
                        {(exp.currency?.code || 'BDT') === activeCurrency.code ? (
                          <span>{activeCurrency.symbol} {exp.amount.toLocaleString()}</span>
                        ) : (
                          <div>
                            <div>
                              {activeCurrency.symbol} {convertAmount(exp.amount, exp.currency?.code || 'BDT', activeCurrency.code).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-normal text-zinc-400 font-sans">
                              Orig: {exp.currency?.symbol || '৳'} {exp.amount.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {exp.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Voucher PDF Download */}
                          <button
                            onClick={() => handleDownloadVoucherPDF(exp)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            title="Download Payment Voucher PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {exp.receiptUrl && (
                            <button
                              onClick={() => setViewingReceiptExpense(exp)}
                              className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition"
                              title="View Receipt"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                            title="Edit Expense"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpenseId(exp.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold">No expenses found matching current filters.</p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition"
                      >
                        + Add First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (optimized for phones & small touch screens) */}
        <div className="block sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((exp) => {
              const catConfig = getCategoryConfig(exp.category);
              return (
                <div key={exp.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {exp.title}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {exp.payeeVendor ? `Payee: ${exp.payeeVendor}` : 'No payee specified'} • {exp.date}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-sm text-orange-600 dark:text-orange-400 font-mono">
                        {exp.currency?.symbol || activeCurrency.symbol} {exp.amount.toLocaleString()}
                      </div>
                      <div className="mt-1">
                        {exp.status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[9px]">
                            PAID
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[9px]">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${catConfig.bgLight}`}>
                        {catConfig.label.split(' ')[0]}
                      </span>
                      {getPaymentMethodBadge(exp.paymentMethod)}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadVoucherPDF(exp)}
                        className="px-2 py-1 text-[11px] font-semibold text-red-500 bg-red-500/10 rounded-lg flex items-center gap-1"
                        title="Download Voucher PDF"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                      {exp.receiptUrl && (
                        <button
                          onClick={() => setViewingReceiptExpense(exp)}
                          className="px-2 py-1 text-[11px] font-semibold text-orange-500 bg-orange-500/10 rounded-lg"
                        >
                          Receipt
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(exp)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingExpenseId(exp.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-400 space-y-3">
              <Receipt className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs">No expenses match your search.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white"
              >
                + Add Expense
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                    {editingExpense ? 'Edit Expense Record' : 'Record Business Expense'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {editingExpense ? `Updating #${editingExpense.id}` : 'Track expenditures & outlays'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adobe Creative Cloud, Office Rent, Facebook Ad Spend"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Category and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount ({activeCurrency.symbol}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 15000"
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full text-xs font-black text-orange-600 dark:text-orange-400 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date and Payee / Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Payee / Vendor / Merchant
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meta Ads, Landlord, Supplier name"
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Method and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="paid">✓ Paid (Settled)</option>
                    <option value="pending">● Pending (Unsettled)</option>
                  </select>
                </div>
              </div>

              {/* Receipt URL / Image Attachment */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Receipt / Voucher URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... or receipt image reference"
                  value={formReceiptUrl}
                  onChange={(e) => setFormReceiptUrl(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Tax deduction notes, department, project code..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-md shadow-orange-500/20 transition cursor-pointer"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Delete Expense Record?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                This action will permanently remove this expense from financial ledger.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingExpenseId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteExpense(deletingExpenseId);
                  setDeletingExpenseId(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewingReceiptExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Receipt for {viewingReceiptExpense.title}
              </div>
              <button
                onClick={() => setViewingReceiptExpense(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl text-center">
              {viewingReceiptExpense.receiptUrl?.startsWith('http') ? (
                <img
                  src={viewingReceiptExpense.receiptUrl}
                  alt="Expense Receipt"
                  className="max-h-80 w-auto mx-auto rounded-lg object-contain shadow-xs"
                />
              ) : (
                <p className="text-xs text-zinc-500 py-6">
                  {viewingReceiptExpense.receiptUrl || 'No digital image file attached.'}
                </p>
              )}
            </div>
            <div className="text-xs text-zinc-500 flex items-center justify-between">
              <button
                onClick={() => handleDownloadVoucherPDF(viewingReceiptExpense)}
                className="text-red-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Voucher PDF</span>
              </button>
              <div>
                Amount: <strong>{viewingReceiptExpense.currency?.symbol || activeCurrency.symbol} {viewingReceiptExpense.amount.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIDDEN PRINT & PDF RENDERING TARGETS                                      */}
      {/* ========================================================================= */}
      
      {/* Master Expense Statement PDF Target */}
      <div className="hidden">
        <div
          id="expense-ledger-target"
          className="bg-white text-zinc-900 p-8 sm:p-10 max-w-4xl mx-auto space-y-6 font-sans"
          style={{ width: '840px', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5 border-zinc-200">
            <div className="space-y-1 max-w-[480px]">
              <ZoolyumLogo size="md" variant="full" fullTagline={true} />
              <p className="text-xs text-zinc-600 font-medium pt-1">
                {companyProfile.address || 'Mirpur 10, Dhaka-1216, Bangladesh'}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Email: {companyProfile.email || 'contact@zoolyum.com'} • Phone: {companyProfile.phone || '01601000950'}
              </p>
            </div>

            <div className="text-right space-y-1">
              <h2 className="text-xl font-black tracking-tight text-zinc-900">
                Expenditure Audit Statement
              </h2>
              <div className="text-xs text-zinc-600 space-y-0.5">
                <p className="font-semibold text-zinc-800">
                  Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
                </p>
                <p>
                  BIN/Tax ID: <span className="font-mono font-bold text-zinc-900">{companyProfile.taxId}</span>
                </p>
                <p className="pt-0.5">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Official Verified Ledger</span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Total Expenses
              </span>
              <div className="text-lg font-black text-zinc-900 font-mono mt-0.5 whitespace-nowrap">
                <span className="font-sans mr-1">{activeCurrency.symbol}</span>
                <span>{filteredTotal.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">{filteredExpenses.length} records</p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Settled / Paid Outflows
              </span>
              <div className="text-lg font-black text-emerald-700 font-mono mt-0.5 whitespace-nowrap">
                <span className="font-sans mr-1">{activeCurrency.symbol}</span>
                <span>{filteredPaid.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5">Cleared</p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Pending Outflows
              </span>
              <div className="text-lg font-black text-amber-700 font-mono mt-0.5 whitespace-nowrap">
                <span className="font-sans mr-1">{activeCurrency.symbol}</span>
                <span>{filteredPending.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-0.5">Awaiting payment</p>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                Net Cash Profit
              </span>
              <div className="text-lg font-black text-orange-700 font-mono mt-0.5 whitespace-nowrap">
                <span className="font-sans mr-1">{activeCurrency.symbol}</span>
                <span>{metrics.netProfit.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-orange-600 mt-0.5">Realized</p>
            </div>
          </div>

          {/* Category Summary */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Category Distribution Summary
            </h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {categoryStats.slice(0, 8).map((cat) => (
                <div key={cat.id} className="p-2.5 rounded-lg bg-white border border-zinc-200">
                  <div className="font-bold text-[11px] text-zinc-600 truncate">{cat.label}</div>
                  <div className="font-black text-zinc-900 font-mono text-xs mt-0.5 whitespace-nowrap inline-flex items-center gap-1">
                    <span className="font-sans">{activeCurrency.symbol}</span>
                    <span>{cat.total.toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">{cat.count} items ({cat.percent}%)</div>
                </div>
              ))}
            </div>
          </div>

          {/* Itemized Table with Fixed Widths & 1-line amount formatting */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              Detailed Expense Transactions Ledger
            </h4>
            <table className="w-full text-left text-xs border border-zinc-200 rounded-lg overflow-hidden table-fixed">
              <thead className="bg-zinc-100 text-zinc-700 font-bold uppercase text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-2.5 px-3 w-[85px] whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 min-w-[210px]">Title / Description</th>
                  <th className="py-2.5 px-3 w-[95px] whitespace-nowrap">Category</th>
                  <th className="py-2.5 px-3 w-[130px] whitespace-nowrap">Payee / Merchant</th>
                  <th className="py-2.5 px-3 w-[70px] whitespace-nowrap text-center">Method</th>
                  <th className="py-2.5 px-3 w-[115px] text-right whitespace-nowrap">Amount</th>
                  <th className="py-2.5 px-3 w-[80px] text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="odd:bg-white even:bg-zinc-50/50">
                    <td className="py-2.5 px-3 text-zinc-600 font-mono text-[11px] whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-900">
                      <div className="leading-snug">{exp.title}</div>
                      {exp.notes && <div className="text-[10px] text-zinc-500 font-normal leading-tight mt-0.5">{exp.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600 uppercase text-[10px] font-bold whitespace-nowrap">
                      {exp.category}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600 text-[11px] truncate max-w-[130px]">
                      {exp.payeeVendor || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600 uppercase text-[10px] text-center whitespace-nowrap font-medium">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-zinc-900 whitespace-nowrap">
                      <span className="whitespace-nowrap inline-flex items-center justify-end gap-1">
                        <span className="font-sans">{exp.currency?.symbol || activeCurrency.symbol}</span>
                        <span>{exp.amount.toLocaleString()}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        exp.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatory Footer */}
          <div className="pt-6 border-t border-zinc-200 flex items-end justify-between text-xs">
            <div className="space-y-1 text-zinc-600">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Digitally Certified Audit Ledger</span>
              </span>
              <p className="text-[11px] text-zinc-500 font-medium">
                Official Agency Record • {companyProfile.name || 'Zoolyum'}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono">
                Tax ID: {companyProfile.taxId} • Contact: {companyProfile.phone}
              </p>
            </div>

            <div className="text-right">
              <AuthorizedSignatureDisplay
                signatureImageUrl={companyProfile.signatureImageUrl}
                signerName={companyProfile.authorizedSignerName}
                signerTitle={companyProfile.authorizedSignerTitle}
                companyName={companyProfile.name}
                theme="pdf"
                align="right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Individual Expense Payment Voucher Target */}
      {selectedVoucherExpense && (
        <div className="hidden">
          <div
            id="expense-voucher-target"
            className="bg-white text-zinc-900 p-8 max-w-xl mx-auto space-y-6 font-sans border border-zinc-200 rounded-xl"
            style={{ width: '680px', backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4 border-zinc-200">
              <div>
                <ZoolyumLogo size="sm" variant="full" fullTagline={true} />
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  BIN/Tax ID: {companyProfile.taxId} • {companyProfile.phone}
                </p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-orange-100 text-orange-700 font-bold text-xs uppercase tracking-wider">
                  Payment Voucher
                </span>
                <p className="text-[11px] text-zinc-600 font-mono mt-1">
                  Voucher #{selectedVoucherExpense.id}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Date: {selectedVoucherExpense.date}
                </p>
              </div>
            </div>

            {/* Voucher Details */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase">Expense Title</span>
                <span className="text-sm font-bold text-zinc-900">{selectedVoucherExpense.title}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase">Category</span>
                <span className="text-xs font-bold text-zinc-800 uppercase">{selectedVoucherExpense.category}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase">Paid To / Payee</span>
                <span className="text-xs font-bold text-zinc-800">{selectedVoucherExpense.payeeVendor || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase">Payment Channel</span>
                <span className="text-xs font-bold text-zinc-800 uppercase">{selectedVoucherExpense.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold text-zinc-700 uppercase">Disbursed Amount</span>
                <span className="text-xl font-black text-orange-600 font-mono whitespace-nowrap inline-flex items-center gap-1">
                  <span className="font-sans">{selectedVoucherExpense.currency?.symbol || activeCurrency.symbol}</span>
                  <span>{selectedVoucherExpense.amount.toLocaleString()}</span>
                </span>
              </div>
            </div>

            {selectedVoucherExpense.notes && (
              <div className="p-3 bg-zinc-100 rounded-lg text-xs text-zinc-600">
                <strong>Notes / Reference:</strong> {selectedVoucherExpense.notes}
              </div>
            )}

            {/* Voucher Signature */}
            <div className="pt-6 border-t border-zinc-200 flex justify-between items-end text-xs">
              <div className="text-zinc-500 text-[10px]">
                Official Disbursement Record • {companyProfile.name || 'Zoolyum'}
              </div>
              <div className="text-right">
                <AuthorizedSignatureDisplay
                  signatureImageUrl={companyProfile.signatureImageUrl}
                  signerName={companyProfile.authorizedSignerName}
                  signerTitle={companyProfile.authorizedSignerTitle}
                  companyName={companyProfile.name}
                  theme="pdf"
                  align="right"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
