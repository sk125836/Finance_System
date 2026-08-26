import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  Sparkles,
  PieChart,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { exportElementToPDF, triggerPrint } from '../../utils/pdfGenerator';
import { ZoolyumLogo } from '../common/ZoolyumLogo';
import { AuthorizedSignatureDisplay } from '../common/AuthorizedSignatureDisplay';

export const AutomatedReports: React.FC = () => {
  const { invoices, expenses, clients, metrics, companyProfile, activeCurrency, convertAmount, exportToCSV, exportToExcelData } = useInvoice();

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Vendor Spending Breakdown Calculation
  const vendorBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; paid: number; due: number }>();

    invoices.forEach((inv) => {
      const clientName = inv.client.name || 'Unnamed Client';
      const existing = map.get(clientName) || {
        name: clientName,
        total: 0,
        count: 0,
        paid: 0,
        due: 0,
      };

      const cTotal = convertAmount(inv.totalAmount, inv.currency?.code || 'BDT', activeCurrency.code);
      const cPaid = convertAmount(inv.paidAmount, inv.currency?.code || 'BDT', activeCurrency.code);
      const cDue = convertAmount(inv.balanceDue, inv.currency?.code || 'BDT', activeCurrency.code);

      existing.total += cTotal;
      existing.count += 1;
      existing.paid += cPaid;
      existing.due += cDue;

      map.set(clientName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [invoices, activeCurrency, convertAmount]);

  // Expense Category Breakdown Calculation
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, { category: string; total: number; count: number }>();

    expenses.forEach((exp) => {
      const cat = exp.category || 'general';
      const existing = map.get(cat) || { category: cat, total: 0, count: 0 };
      const cAmount = convertAmount(exp.amount, exp.currency?.code || 'BDT', activeCurrency.code);
      existing.total += cAmount;
      existing.count += 1;
      map.set(cat, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expenses, activeCurrency, convertAmount]);

  // Tax & Discount Totals
  const totalTaxCollected = invoices.reduce(
    (sum, i) => sum + convertAmount(i.taxAmount, i.currency?.code || 'BDT', activeCurrency.code),
    0
  );
  const totalDiscountsGiven = invoices.reduce(
    (sum, i) => sum + convertAmount(i.discountAmount, i.currency?.code || 'BDT', activeCurrency.code),
    0
  );

  // Generate Report PDF
  const handleDownloadReportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await exportElementToPDF('executive-report-target', `Zoolyum_Financial_Report_${new Date().toISOString().split('T')[0]}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              Automatic Financial & Revenue Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Audit ledgers, income vs expenses, net profit analytics, and official statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCSV()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-500" />
            <span>CSV Data</span>
          </button>

          <button
            onClick={() => exportToExcelData()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel Ledger</span>
          </button>

          <button
            onClick={handleDownloadReportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <FileText className={`w-4 h-4 ${isExportingPDF ? 'animate-spin' : ''}`} />
            <span>{isExportingPDF ? 'Generating...' : 'Download Report PDF'}</span>
          </button>
        </div>
      </div>

      {/* Visual Report Container (printable/renderable target) */}
      <div
        id="executive-report-target"
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-8 space-y-6 sm:space-y-8 shadow-sm text-zinc-900 dark:text-zinc-100 transition-colors"
      >
        {/* Report Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1.5 max-w-[460px]">
            <ZoolyumLogo size="md" variant="full" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium pt-1 leading-relaxed">
              {companyProfile.address || 'Mirpur 10, Dhaka-1216, Bangladesh'}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 font-mono">
              Email: {companyProfile.email || 'contact@zoolyum.com'} • Phone: {companyProfile.phone || '01601000950'}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1.5 shrink-0">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              Financial Audit Report
            </h2>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
              </p>
              <p>
                BIN/Tax ID:{' '}
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {companyProfile.taxId}
                </span>
              </p>
              <p className="pt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Verified Official Agency Ledger</span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 4 Key Executive Financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Gross Invoiced
            </span>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-1 font-mono">
              {activeCurrency.symbol} {metrics.totalInvoiced.toLocaleString()}
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{metrics.totalInvoicesCount} invoices issued</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Realized Revenue (Paid)
            </span>
            <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
              {activeCurrency.symbol} {metrics.totalPaid.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400/90 mt-0.5 font-medium">
              {metrics.collectionRate.toFixed(1)}% recovery rate
            </p>
          </div>

          <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Total Expenses
            </span>
            <h3 className="text-xl font-black text-red-700 dark:text-red-400 mt-1 font-mono">
              {activeCurrency.symbol} {metrics.totalExpenses.toLocaleString()}
            </h3>
            <p className="text-[10px] text-red-700/90 dark:text-red-400/90 mt-0.5 font-medium">
              {metrics.expensesCount} expense records
            </p>
          </div>

          <div className="p-4 rounded-xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:orange-800/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              Net Cash Profit
            </span>
            <h3 className={`text-xl font-black mt-1 font-mono ${metrics.netProfit >= 0 ? 'text-orange-700 dark:text-orange-400' : 'text-red-500'}`}>
              {activeCurrency.symbol} {metrics.netProfit.toLocaleString()}
            </h3>
            <p className="text-[10px] text-orange-700/90 dark:text-orange-400/90 mt-0.5 font-medium">
              Realized cash in hand
            </p>
          </div>
        </div>

        {/* Vendor-Wise Billing Breakdown Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2 whitespace-nowrap">
              <PieChart className="w-4 h-4 text-orange-500 shrink-0" />
              <span>Client / Vendor Revenue Distribution</span>
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{vendorBreakdown.length} active client accounts</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/80 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Client / Vendor</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Invoices</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Total Billed</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Balance Due</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {vendorBreakdown.map((item) => {
                  const percentage = metrics.totalInvoiced > 0 ? (item.total / metrics.totalInvoiced) * 100 : 0;
                  return (
                    <tr key={item.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                      <td className="py-3.5 px-3 sm:px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{item.count}</td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono whitespace-nowrap">
                        {activeCurrency.symbol} {item.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                        {activeCurrency.symbol} {item.paid.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-red-500 dark:text-red-400 font-mono whitespace-nowrap">
                        {item.due > 0 ? `${activeCurrency.symbol} ${item.due.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 sm:w-16 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Category Breakdown Section */}
        {expenseCategoryBreakdown.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2 whitespace-nowrap">
                <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                <span>Operating Expense Breakdown</span>
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{expenses.length} total entries</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {expenseCategoryBreakdown.map((cat) => (
                <div key={cat.category} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                    {cat.category}
                  </div>
                  <div className="text-base font-black font-mono text-zinc-900 dark:text-white">
                    {activeCurrency.symbol} {cat.total.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium">
                    {cat.count} expense item(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Summary Notes */}
        <div className="p-4.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Automatic Executive Observations</span>
          </div>
          <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-1.5 text-xs">
            <p>
              1. All bills are indexed with unique transaction keys, compliant with Bangladesh VAT/Tax standards.
            </p>
            <p>
              2. Realized cash flow is healthy: <b className="text-zinc-900 dark:text-white font-bold">{activeCurrency.symbol} {metrics.totalPaid.toLocaleString()}</b> collected against <b className="text-red-600 dark:text-red-400 font-bold">{activeCurrency.symbol} {metrics.totalExpenses.toLocaleString()}</b> expenses, resulting in <b className="text-emerald-600 dark:text-emerald-400 font-bold">{activeCurrency.symbol} {metrics.netProfit.toLocaleString()}</b> net cash profit.
            </p>
            <p>
              3. Follow up recommended for <b className="text-red-600 dark:text-red-400 font-bold">{metrics.overdueCount} overdue bill(s)</b> amounting to <b className="text-red-600 dark:text-red-400 font-bold">{activeCurrency.symbol} {metrics.totalOverdue.toLocaleString()}</b>.
            </p>
          </div>
        </div>

        {/* Official Report Footer with Authorized Signatory & Verification */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span>Digitally Certified Ledger</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium leading-normal">
              Generated via {companyProfile.name || 'Zoolyum'} Financial Engine • Official Agency Record
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono leading-normal">
              BIN/Tax ID: {companyProfile.taxId} • Contact: {companyProfile.phone}
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
  );
};
