import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Save,
  Plus,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  UserCheck,
  CreditCard,
  Percent,
  ArrowLeft,
  Upload,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Truck,
  FileCheck2,
  Receipt,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useInvoice } from '../../context/InvoiceContext';
import { Invoice, InvoiceItem, PaymentDetails, InvoiceStatus } from '../../types/invoice';
import { exportElementToPDF, numberToWords, triggerPrint } from '../../utils/pdfGenerator';
import { SUPPORTED_CURRENCIES } from '../../types/mockData';
import { ZoolyumLogo } from '../common/ZoolyumLogo';
import { CustomLogoUploader } from '../common/CustomLogoUploader';
import { AuthorizedSignatureDisplay } from '../common/AuthorizedSignatureDisplay';

interface InvoiceGeneratorProps {
  initialInvoice?: Invoice | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  initialInvoice,
  onSaved,
  onCancel,
}) => {
  const {
    companyProfile,
    clients,
    activeCurrency,
    addInvoice,
    updateInvoice,
    updateCompanyProfile,
  } = useInvoice();

  // Custom Logo State (initialized from initial invoice or global company profile)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | undefined>(
    initialInvoice?.company?.logoUrl || companyProfile.logoUrl
  );
  const [showLogoConfig, setShowLogoConfig] = useState(false);

  // Generator State
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice ? initialInvoice.invoiceNumber : `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [issueDate, setIssueDate] = useState(
    initialInvoice ? initialInvoice.issueDate : new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(() => {
    if (initialInvoice) return initialInvoice.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<InvoiceStatus>(
    initialInvoice ? initialInvoice.status : 'pending'
  );

  // Client Details
  const [clientName, setClientName] = useState(initialInvoice?.client.name || '');
  const [clientCompany, setClientCompany] = useState(initialInvoice?.client.company || '');
  const [clientEmail, setClientEmail] = useState(initialInvoice?.client.email || '');
  const [clientPhone, setClientPhone] = useState(initialInvoice?.client.phone || '');
  const [clientAddress, setClientAddress] = useState(initialInvoice?.client.address || '');
  const [clientTaxId, setClientTaxId] = useState(initialInvoice?.client.taxId || '');

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialInvoice && initialInvoice.items.length > 0) {
      return initialInvoice.items;
    }
    return [
      {
        id: 'item-1',
        description: 'Brand Strategy & Visual Identity Design System',
        quantity: 1,
        unitPrice: 150000,
        amount: 150000,
      },
    ];
  });

  // Rates & Adjustments
  const [taxRate, setTaxRate] = useState<number>(initialInvoice ? initialInvoice.taxRate : 5);
  const [discountRate, setDiscountRate] = useState<number>(initialInvoice ? initialInvoice.discountRate : 0);
  const [shippingFee, setShippingFee] = useState<number>(initialInvoice ? initialInvoice.shippingFee : 0);
  const [paidAmount, setPaidAmount] = useState<number>(initialInvoice ? initialInvoice.paidAmount : 0);

  // Template & Payment
  const [templateStyle, setTemplateStyle] = useState<'zoolyum-dark' | 'modern-orange' | 'minimal-clean'>(
    (initialInvoice?.templateStyle as any) || 'modern-orange'
  );
  const [notes, setNotes] = useState(initialInvoice?.notes || companyProfile.defaultNotes);
  const [terms, setTerms] = useState(initialInvoice?.terms || companyProfile.defaultTerms);

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(
    initialInvoice?.paymentDetails || companyProfile.defaultPaymentDetails
  );

  // Currency for this invoice
  const [currency, setCurrency] = useState(initialInvoice?.currency || activeCurrency);

  // UI States
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Responsive Live Preview Zoom & Auto-Scale States
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [zoomMode, setZoomMode] = useState<'fit' | '100' | 'custom'>('fit');
  const [customZoom, setCustomZoom] = useState<number>(0.85);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Observe container width dynamically on window resize or panel toggle
  useEffect(() => {
    if (!previewWrapperRef.current) return;
    const updateWidth = () => {
      if (previewWrapperRef.current) {
        setContainerWidth(previewWrapperRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(previewWrapperRef.current);
    return () => observer.disconnect();
  }, [showLivePreview]);

  // Compute scale multiplier for the standard 800px-wide A4 document
  const effectiveScale = useMemo(() => {
    if (zoomMode === '100') return 1;
    if (zoomMode === 'custom') return customZoom;
    // 'fit' mode: dynamically scale to fit available width cleanly without horizontal overflow
    const available = Math.max(300, containerWidth - 36);
    return Math.min(1, Math.max(0.38, Number((available / 800).toFixed(3))));
  }, [zoomMode, customZoom, containerWidth]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = (subtotal * discountRate) / 100;
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount + Number(shippingFee || 0));
  const balanceDue = Math.max(0, totalAmount - Number(paidAmount || 0));

  // Quick Client selection
  const handleSelectClient = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClientName(found.name);
      setClientCompany(found.company || '');
      setClientEmail(found.email || '');
      setClientPhone(found.phone || '');
      setClientAddress(found.address || '');
      setClientTaxId(found.taxId || '');
    }
  };

  // Item list handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
      item.amount = Math.max(0, q) * Math.max(0, p);
    }
    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: 'Digital Marketing & Content Asset Creation',
      quantity: 1,
      unitPrice: 25000,
      amount: 25000,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Save invoice handler
  const handleSaveInvoice = (newStatus?: InvoiceStatus) => {
    const finalStatus = newStatus || status;
    const finalPaid = finalStatus === 'paid' ? totalAmount : paidAmount;

    const invoicePayload = {
      invoiceNumber,
      issueDate,
      dueDate,
      status: finalStatus,
      client: {
        name: clientName.trim() || 'Valued Client',
        company: clientCompany,
        email: clientEmail,
        phone: clientPhone,
        address: clientAddress,
        taxId: clientTaxId,
      },
      company: {
        ...companyProfile,
        logoUrl: customLogoUrl,
      },
      currency,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      shippingFee: Number(shippingFee || 0),
      totalAmount,
      paidAmount: finalPaid,
      balanceDue: finalStatus === 'paid' ? 0 : totalAmount - finalPaid,
      paymentDetails,
      notes,
      terms,
      templateStyle,
    };

    if (initialInvoice?.id) {
      updateInvoice(initialInvoice.id, invoicePayload);
    } else {
      addInvoice(invoicePayload);
    }

    setIsSavedSuccess(true);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#ff5400', '#f97316', '#fbbf24', '#10b981'],
    });

    setTimeout(() => {
      setIsSavedSuccess(false);
      if (onSaved) onSaved();
    }, 1200);
  };

  // Direct PDF Download
  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      await exportElementToPDF(
        'invoice-render-target',
        `Invoice_${invoiceNumber}_${clientName.replace(/\s+/g, '_') || 'Client'}`
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition shrink-0 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {initialInvoice ? 'Edit Invoice' : 'Invoice Generator'}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                #{invoiceNumber}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Create and download professional invoices and client billing statements.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Preview Toggle */}
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
          >
            {showLivePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showLivePreview ? 'Hide Preview' : 'Show Preview'}</span>
            <span className="sm:hidden">{showLivePreview ? 'Hide' : 'Preview'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-md shadow-orange-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isExportingPDF ? 'animate-bounce' : ''}`} />
            <span>{isExportingPDF ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {/* Save to History */}
          <button
            type="button"
            onClick={() => handleSaveInvoice()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow transition active:scale-95 cursor-pointer"
          >
            {isSavedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container: Grid layout for Editor & Live Preview */}
      <div className={`grid grid-cols-1 ${showLivePreview ? 'xl:grid-cols-12' : 'max-w-4xl mx-auto'} gap-6`}>
        {/* Left Side: Interactive Editor Form */}
        <div className={`${showLivePreview ? 'xl:col-span-6 2xl:col-span-5' : 'w-full'} space-y-6`}>
          
          {/* Card 0: Brand & Custom Logo (PNG) */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Brand & Custom Logo
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoConfig(!showLogoConfig)}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {showLogoConfig ? 'Close Logo Setup' : customLogoUrl ? 'Manage Logo' : '+ Upload PNG Logo'}
              </button>
            </div>

            {showLogoConfig ? (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <CustomLogoUploader
                  currentLogoUrl={customLogoUrl}
                  onLogoChange={(newUrl) => {
                    setCustomLogoUrl(newUrl);
                    updateCompanyProfile({ logoUrl: newUrl });
                  }}
                  title="Invoice Brand Logo"
                  description={`Upload transparent PNG logo for ${companyProfile.name || 'Your Company'}`}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0 shadow-xs">
                    <ZoolyumLogo size="sm" customLogoUrl={customLogoUrl} customName={companyProfile.name} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {companyProfile.name || 'Your Company'}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                      {customLogoUrl ? 'Custom PNG Active' : 'Default Vector Active'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoConfig(true)}
                  className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{customLogoUrl ? 'Change' : 'Upload PNG'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 1: Invoice & Status Setup */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  1. Invoice & Status Setup
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Step 1 of 4
              </span>
            </div>

            {/* Grid 1: Basic Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  placeholder="INV-2026-001"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Date of Issue *
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Payment Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Grid 2: Status & Currency Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Invoice Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  aria-label="Payment Status"
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                >
                  <option value="pending">🟡 Payment Pending (Unpaid)</option>
                  <option value="paid">🟢 Paid in Full</option>
                  <option value="overdue">🔴 Overdue / Past Due</option>
                  <option value="draft">⚪ Working Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Billing Currency
                </label>
                <select
                  value={currency.code}
                  onChange={(e) => {
                    const c = SUPPORTED_CURRENCIES.find((item) => item.code === e.target.value);
                    if (c) setCurrency(c);
                  }}
                  aria-label="Billing Currency"
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                >
                  {SUPPORTED_CURRENCIES.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.symbol} ({cur.code}) - {cur.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Vendor / Client Details */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  2. Client & Billed-To Details
                </h2>
              </div>

              {/* Quick Select Client dropdown */}
              {clients.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    onChange={(e) => handleSelectClient(e.target.value)}
                    defaultValue=""
                    aria-label="Quick Autofill Vendor"
                    className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="" disabled>
                      ⚡ Quick Autofill Client...
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Grid Layout for Client Info */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Client / Recipient Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Footwear Ltd."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Group"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    placeholder="billing@company.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+880 1711-XXXXXX"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <span>Billing Address</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Street address, Area, City"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Client Tax / BIN ID
                  </label>
                  <input
                    type="text"
                    placeholder="BIN: 002938491-01"
                    value={clientTaxId}
                    onChange={(e) => setClientTaxId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Line Items & Bill Amount */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  3. Line Items & Pricing ({currency.symbol})
                </h2>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Dynamic Item Rows */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      Item #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                      Description / Service
                    </label>
                    <input
                      type="text"
                      placeholder="Service or product description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Clean Responsive 3-Column Item Math Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))
                        }
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                        Unit Price ({currency.symbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'unitPrice', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full text-xs font-bold text-orange-600 dark:text-orange-400 px-2.5 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-orange-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                        Line Amount
                      </label>
                      <div className="w-full text-xs font-mono font-black px-3 py-2 rounded-lg bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">Total:</span>
                        <span>
                          {currency.symbol} {item.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations & Adjustments Grid */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    VAT / Tax (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Shipping ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Paid / Advance ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none font-mono text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Total Summary Box */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mt-3 space-y-2">
                <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">
                    {currency.symbol} {subtotal.toLocaleString()}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300">
                    <span>Tax / VAT ({taxRate}%):</span>
                    <span className="font-mono font-semibold">
                      + {currency.symbol} {taxAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {discountRate > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({discountRate}%):</span>
                    <span className="font-mono font-semibold">
                      - {currency.symbol} {discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {shippingFee > 0 && (
                  <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300">
                    <span>Shipping / Delivery:</span>
                    <span className="font-mono font-semibold">
                      + {currency.symbol} {shippingFee.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 pt-2 border-t border-orange-500/20">
                  <span>Grand Total:</span>
                  <span className="font-mono">
                    {currency.symbol} {totalAmount.toLocaleString()}
                  </span>
                </div>
                {paidAmount > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-dashed border-orange-500/20">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">Balance Due:</span>
                    <span className="font-mono font-bold text-red-500">
                      {currency.symbol} {balanceDue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Payment Details & Notes */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  4. Payment Instructions & Notes
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Step 4 of 4
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bank / Institution Name
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.bankName || ''}
                    onChange={(e) =>
                      setPaymentDetails({ ...paymentDetails, bankName: e.target.value })
                    }
                    placeholder="e.g. City Bank PLC"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Account / Routing Number
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.accountNumber || ''}
                    onChange={(e) =>
                      setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })
                    }
                    placeholder="1102938475001"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mobile Wallet / bKash / Nagad
                </label>
                <input
                  type="text"
                  value={paymentDetails.mobileWalletNumber || ''}
                  onChange={(e) =>
                    setPaymentDetails({ ...paymentDetails, mobileWalletNumber: e.target.value })
                  }
                  placeholder="01601000950 (bKash Merchant)"
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Invoice Terms & Conditions
                  </label>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Payment terms..."
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Custom Footer Note
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thank you for your business..."
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Printable Render Paper */}
        {showLivePreview && (
          <div className="xl:col-span-6 2xl:col-span-7 flex flex-col items-center min-w-0 w-full">
            {/* Top Toolbar: Template Style & Zoom Controls */}
            <div className="w-full flex items-center justify-between mb-3 px-1 flex-wrap gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Preview (A4)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                  {Math.round(effectiveScale * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Template Style Selector */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setTemplateStyle('modern-orange')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      templateStyle === 'modern-orange'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Modern
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateStyle('zoolyum-dark')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      templateStyle === 'zoolyum-dark'
                        ? 'bg-zinc-950 text-orange-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Executive Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateStyle('minimal-clean')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      templateStyle === 'minimal-clean'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Minimalist
                  </button>
                </div>

                {/* Responsive Zoom Controls */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setZoomMode('fit')}
                    title="Auto-Fit to Screen"
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                      zoomMode === 'fit'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('100')}
                    title="100% True Size"
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                      zoomMode === '100'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('custom');
                      setCustomZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))));
                    }}
                    title="Zoom Out"
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('custom');
                      setCustomZoom((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(2))));
                    }}
                    title="Zoom In"
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreenPreview(true)}
                    title="Maximize Fullscreen Preview"
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer border-l border-zinc-200 dark:border-zinc-700 pl-1.5"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* The Responsive Scaled A4 Document Container */}
            <div
              ref={previewWrapperRef}
              className="w-full overflow-x-auto pb-4 flex justify-center bg-zinc-100/70 dark:bg-zinc-950/60 p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner"
            >
              <div
                style={{
                  width: `${800 * effectiveScale}px`,
                  height: `${1150 * effectiveScale}px`,
                  position: 'relative',
                  transition: 'width 0.15s ease, height 0.15s ease',
                }}
                className="shrink-0 rounded-xl shadow-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80 bg-white"
              >
                <div
                  id="invoice-render-target"
                  style={{
                    width: '800px',
                    minWidth: '800px',
                    minHeight: '1150px',
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                    backgroundColor: '#ffffff',
                    color: '#18181b',
                  }}
                  className={`p-10 sm:p-12 font-sans relative flex flex-col justify-between select-text ${
                    templateStyle === 'zoolyum-dark'
                      ? 'border-zinc-800'
                      : templateStyle === 'minimal-clean'
                      ? 'border-zinc-200'
                      : 'border-orange-100'
                  }`}
                >
                  <div>
                    {/* Decorative Template Accent Bar */}
                    {templateStyle === 'modern-orange' && (
                      <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-full mb-6" />
                    )}
                    {templateStyle === 'zoolyum-dark' && (
                      <div className="h-2 w-full bg-zinc-950 rounded-full mb-6" />
                    )}
                    {templateStyle === 'minimal-clean' && (
                      <div className="h-[1px] w-full bg-zinc-300 mb-6" />
                    )}

                    {/* Top Header Row */}
                    <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-200">
                      <div className="space-y-1 max-w-[460px]">
                        {/* Brand Logo Container */}
                        <div className="min-h-[52px] flex items-center justify-start pb-1">
                          <ZoolyumLogo
                            size="lg"
                            variant="full"
                            customLogoUrl={customLogoUrl}
                            customName={companyProfile.name}
                          />
                        </div>

                        <div className="text-xs pt-1 space-y-1 text-zinc-600 font-medium leading-relaxed">
                          <p>{companyProfile.address || 'Mirpur 10, Dhaka-1216, Bangladesh'}</p>
                          <p>
                            <span className="font-semibold text-zinc-700">Phone:</span>{' '}
                            {companyProfile.phone || '01601000950'}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-700">Email:</span>{' '}
                            {companyProfile.email || 'contact@yourcompany.com'}
                          </p>
                          <p>
                            {companyProfile.taxId || 'BIN: 004928194-0101'} |{' '}
                            {companyProfile.website || 'www.yourcompany.com'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-1.5 shrink-0">
                        <h3
                          className={`text-2xl font-mono font-black pt-1 whitespace-nowrap tracking-tight ${
                            templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'
                          }`}
                        >
                          #{invoiceNumber}
                        </h3>
                        <div className="text-xs space-y-1 pt-1 text-zinc-600 font-medium whitespace-nowrap">
                          <p>
                            <span className="font-bold text-zinc-800">Date of Issue:</span> {issueDate}
                          </p>
                          <p>
                            <span className="font-bold text-zinc-800">Payment Due:</span> {dueDate}
                          </p>
                        </div>

                        {/* Status Stamp */}
                        <div className="pt-2">
                          {status === 'paid' && (
                            <span className="inline-block px-3 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-extrabold text-xs border border-emerald-300 uppercase tracking-wider whitespace-nowrap">
                              ✓ PAID IN FULL
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="inline-block px-3 py-0.5 rounded-md bg-amber-100 text-amber-700 font-extrabold text-xs border border-amber-300 uppercase tracking-wider whitespace-nowrap">
                              ● PAYMENT PENDING
                            </span>
                          )}
                          {status === 'overdue' && (
                            <span className="inline-block px-3 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-xs border border-red-300 uppercase tracking-wider whitespace-nowrap">
                              ! OVERDUE
                            </span>
                          )}
                          {status === 'draft' && (
                            <span className="inline-block px-3 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-extrabold text-xs border border-zinc-300 uppercase tracking-wider whitespace-nowrap">
                              DRAFT INVOICE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Billed To / Client Details */}
                    <div
                      className={`py-5 grid grid-cols-2 gap-8 border-b border-zinc-200 bg-white ${
                        templateStyle === 'zoolyum-dark' ? 'bg-zinc-50/50 rounded-lg px-3 my-2' : ''
                      }`}
                    >
                      <div>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            templateStyle === 'modern-orange'
                              ? 'text-orange-600'
                              : templateStyle === 'zoolyum-dark'
                              ? 'text-zinc-900'
                              : 'text-zinc-600'
                          }`}
                        >
                          BILLED TO / CLIENT
                        </span>
                        <h4 className="text-base font-black mt-1 text-zinc-900">
                          {clientName || 'Client Name / Company'}
                        </h4>
                        {clientCompany && (
                          <p className="text-xs font-bold text-zinc-700">{clientCompany}</p>
                        )}
                        <p className="text-xs text-zinc-600 mt-1">{clientAddress || 'Dhaka, Bangladesh'}</p>
                        <p className="text-xs text-zinc-600">
                          {clientPhone} {clientEmail ? `• ${clientEmail}` : ''}
                        </p>
                        {clientTaxId && (
                          <p className="text-[11px] text-zinc-500 mt-0.5">{clientTaxId}</p>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            templateStyle === 'modern-orange'
                              ? 'text-orange-600'
                              : templateStyle === 'zoolyum-dark'
                              ? 'text-zinc-900'
                              : 'text-zinc-600'
                          }`}
                        >
                          PAYMENT INSTRUCTIONS
                        </span>
                        <p className="text-xs font-bold text-zinc-900">
                          {paymentDetails.bankName || 'City Bank PLC'}
                        </p>
                        <p className="text-xs text-zinc-600">
                          A/C: {paymentDetails.accountNumber || '1102938475001'}
                        </p>
                        {paymentDetails.mobileWalletNumber && (
                          <p
                            className={`text-xs font-bold ${
                              templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'
                            }`}
                          >
                            {paymentDetails.mobileWalletNumber}
                          </p>
                        )}
                        <p className="text-[11px] text-zinc-500">Ref: Invoice #{invoiceNumber}</p>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="py-5 bg-white">
                      <table className="w-full text-left text-xs bg-white">
                        <thead>
                          <tr
                            className={`${
                              templateStyle === 'zoolyum-dark'
                                ? 'bg-zinc-950 text-zinc-100 font-bold uppercase tracking-wider text-[10px]'
                                : templateStyle === 'minimal-clean'
                                ? 'border-b-2 border-zinc-900 text-zinc-900 font-black uppercase tracking-wider text-[10px] bg-white'
                                : 'border-b border-zinc-300 text-zinc-600 font-bold uppercase tracking-wider text-[10px] bg-white'
                            }`}
                          >
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-2">Item & Description</th>
                            <th className="py-2.5 px-2 text-center w-16">Qty</th>
                            <th className="py-2.5 px-2 text-right w-28">
                              Rate ({currency.symbol})
                            </th>
                            <th className="py-2.5 px-3 text-right w-32">
                              Amount ({currency.symbol})
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                          {items.map((item, idx) => (
                            <tr
                              key={item.id || idx}
                              className={
                                idx % 2 === 1 && templateStyle === 'zoolyum-dark'
                                  ? 'bg-zinc-50/70'
                                  : 'bg-white'
                              }
                            >
                              <td className="py-3 px-3 text-center text-zinc-400 font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-2 font-medium">
                                <div className="font-bold text-zinc-900">{item.description}</div>
                              </td>
                              <td className="py-3 px-2 text-center font-bold text-zinc-800">
                                {item.quantity}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-zinc-700">
                                {item.unitPrice.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-black text-zinc-900">
                                {item.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="pt-4 flex justify-end border-t border-zinc-200 bg-white">
                      <div className="w-72 space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-600">
                          <span>Subtotal:</span>
                          <span className="font-mono font-semibold">
                            {currency.symbol} {subtotal.toLocaleString()}
                          </span>
                        </div>
                        {taxRate > 0 && (
                          <div className="flex justify-between text-zinc-600">
                            <span>VAT / Tax ({taxRate}%):</span>
                            <span className="font-mono font-semibold">
                              + {currency.symbol} {taxAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {discountRate > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Discount ({discountRate}%):</span>
                            <span className="font-mono">
                              - {currency.symbol} {discountAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {shippingFee > 0 && (
                          <div className="flex justify-between text-zinc-600">
                            <span>Shipping / Delivery:</span>
                            <span className="font-mono font-semibold">
                              + {currency.symbol} {shippingFee.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex justify-between text-base font-black pt-2 border-t border-zinc-300 ${
                            templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'
                          }`}
                        >
                          <span>Grand Total:</span>
                          <span className="font-mono">
                            {currency.symbol} {totalAmount.toLocaleString()}
                          </span>
                        </div>
                        {paidAmount > 0 && (
                          <>
                            <div className="flex justify-between text-emerald-600 font-semibold">
                              <span>Paid Amount:</span>
                              <span className="font-mono">
                                {currency.symbol} {paidAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-red-600 border-t border-dashed border-zinc-300 pt-1">
                              <span>Balance Due:</span>
                              <span className="font-mono">
                                {currency.symbol} {balanceDue.toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount in words */}
                    <div
                      className={`mt-4 p-3 rounded-lg text-xs ${
                        templateStyle === 'modern-orange'
                          ? 'bg-orange-50/50 border border-orange-200/80 text-zinc-800'
                          : templateStyle === 'zoolyum-dark'
                          ? 'bg-zinc-100 border border-zinc-300 text-zinc-900'
                          : 'bg-white border border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'
                        }`}
                      >
                        In Words:{' '}
                      </span>
                      <span className="font-medium italic text-zinc-800">
                        {numberToWords(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Footer notes and signature */}
                  <div className="pt-6 mt-6 border-t border-zinc-200 flex items-end justify-between text-xs bg-white">
                    <div className="max-w-md space-y-1 text-[11px] text-zinc-600">
                      <p
                        className={`font-bold uppercase tracking-wider ${
                          templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'
                        }`}
                      >
                        Terms & Conditions
                      </p>
                      <p>{terms}</p>
                      <p className="italic pt-1 text-zinc-500">{notes}</p>
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
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal Preview for Crisp Full-Detail Inspection */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full p-4 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-white">Full Document Inspection</span>
                <span className="text-xs text-zinc-400">({templateStyle.toUpperCase()})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExportingPDF}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white flex items-center gap-1.5 hover:bg-orange-600 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-auto py-4 flex justify-center bg-zinc-950/50 rounded-xl mt-3 p-4">
              <div
                style={{
                  width: '800px',
                  minWidth: '800px',
                  minHeight: '1150px',
                  backgroundColor: '#ffffff',
                  color: '#18181b',
                }}
                className="p-12 shadow-2xl rounded-xl border border-zinc-300 font-sans relative flex flex-col justify-between select-text"
              >
                <div>
                  {templateStyle === 'modern-orange' && (
                    <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-full mb-6" />
                  )}
                  {templateStyle === 'zoolyum-dark' && (
                    <div className="h-2 w-full bg-zinc-950 rounded-full mb-6" />
                  )}
                  {templateStyle === 'minimal-clean' && (
                    <div className="h-[1px] w-full bg-zinc-300 mb-6" />
                  )}

                  <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-200">
                    <div className="space-y-1 max-w-[460px]">
                      <div className="min-h-[52px] flex items-center justify-start pb-1">
                        <ZoolyumLogo
                          size="lg"
                          variant="full"
                          customLogoUrl={customLogoUrl}
                          customName={companyProfile.name}
                        />
                      </div>
                      <div className="text-xs pt-1 space-y-1 text-zinc-600 font-medium leading-relaxed">
                        <p>{companyProfile.address || 'Mirpur 10, Dhaka-1216, Bangladesh'}</p>
                        <p><span className="font-semibold text-zinc-700">Phone:</span> {companyProfile.phone || '01601000950'}</p>
                        <p><span className="font-semibold text-zinc-700">Email:</span> {companyProfile.email || 'contact@yourcompany.com'}</p>
                        <p>{companyProfile.taxId || 'BIN: 004928194-0101'} | {companyProfile.website || 'www.yourcompany.com'}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-1.5 shrink-0">
                      <h3 className={`text-2xl font-mono font-black pt-1 whitespace-nowrap tracking-tight ${templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'}`}>
                        #{invoiceNumber}
                      </h3>
                      <div className="text-xs space-y-1 pt-1 text-zinc-600 font-medium whitespace-nowrap">
                        <p><span className="font-bold text-zinc-800">Date of Issue:</span> {issueDate}</p>
                        <p><span className="font-bold text-zinc-800">Payment Due:</span> {dueDate}</p>
                      </div>
                      <div className="pt-2">
                        {status === 'paid' && <span className="inline-block px-3 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-extrabold text-xs border border-emerald-300 uppercase tracking-wider">✓ PAID IN FULL</span>}
                        {status === 'pending' && <span className="inline-block px-3 py-0.5 rounded-md bg-amber-100 text-amber-700 font-extrabold text-xs border border-amber-300 uppercase tracking-wider">● PAYMENT PENDING</span>}
                        {status === 'overdue' && <span className="inline-block px-3 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-xs border border-red-300 uppercase tracking-wider">! OVERDUE</span>}
                        {status === 'draft' && <span className="inline-block px-3 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-extrabold text-xs border border-zinc-300 uppercase tracking-wider">DRAFT INVOICE</span>}
                      </div>
                    </div>
                  </div>

                  <div className="py-5 grid grid-cols-2 gap-8 border-b border-zinc-200 bg-white">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-600'}`}>
                        BILLED TO / CLIENT
                      </span>
                      <h4 className="text-base font-black mt-1 text-zinc-900">{clientName || 'Client Name / Company'}</h4>
                      {clientCompany && <p className="text-xs font-bold text-zinc-700">{clientCompany}</p>}
                      <p className="text-xs text-zinc-600 mt-1">{clientAddress || 'Dhaka, Bangladesh'}</p>
                      <p className="text-xs text-zinc-600">{clientPhone} {clientEmail ? `• ${clientEmail}` : ''}</p>
                      {clientTaxId && <p className="text-[11px] text-zinc-500 mt-0.5">{clientTaxId}</p>}
                    </div>

                    <div className="text-right space-y-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-600'}`}>
                        PAYMENT INSTRUCTIONS
                      </span>
                      <p className="text-xs font-bold text-zinc-900">{paymentDetails.bankName || 'City Bank PLC'}</p>
                      <p className="text-xs text-zinc-600">A/C: {paymentDetails.accountNumber || '1102938475001'}</p>
                      {paymentDetails.mobileWalletNumber && <p className="text-xs font-bold text-orange-600">{paymentDetails.mobileWalletNumber}</p>}
                      <p className="text-[11px] text-zinc-500">Ref: Invoice #{invoiceNumber}</p>
                    </div>
                  </div>

                  <div className="py-5 bg-white">
                    <table className="w-full text-left text-xs bg-white">
                      <thead>
                        <tr className="border-b border-zinc-300 text-zinc-600 font-bold uppercase tracking-wider text-[10px] bg-white">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-2">Item & Description</th>
                          <th className="py-2.5 px-2 text-center w-16">Qty</th>
                          <th className="py-2.5 px-2 text-right w-28">Rate ({currency.symbol})</th>
                          <th className="py-2.5 px-3 text-right w-32">Amount ({currency.symbol})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white">
                        {items.map((item, idx) => (
                          <tr key={item.id || idx} className="bg-white">
                            <td className="py-3 px-3 text-center text-zinc-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-2 font-medium"><div className="font-bold text-zinc-900">{item.description}</div></td>
                            <td className="py-3 px-2 text-center font-bold text-zinc-800">{item.quantity}</td>
                            <td className="py-3 px-2 text-right font-mono text-zinc-700">{item.unitPrice.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right font-mono font-black text-zinc-900">{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 flex justify-end border-t border-zinc-200 bg-white">
                    <div className="w-72 space-y-2 text-xs">
                      <div className="flex justify-between text-zinc-600">
                        <span>Subtotal:</span>
                        <span className="font-mono font-semibold">{currency.symbol} {subtotal.toLocaleString()}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between text-zinc-600">
                          <span>VAT / Tax ({taxRate}%):</span>
                          <span className="font-mono font-semibold">+ {currency.symbol} {taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {discountRate > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Discount ({discountRate}%):</span>
                          <span className="font-mono">- {currency.symbol} {discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {shippingFee > 0 && (
                        <div className="flex justify-between text-zinc-600">
                          <span>Shipping / Delivery:</span>
                          <span className="font-mono font-semibold">+ {currency.symbol} {shippingFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black pt-2 border-t border-zinc-300 text-orange-600">
                        <span>Grand Total:</span>
                        <span className="font-mono">{currency.symbol} {totalAmount.toLocaleString()}</span>
                      </div>
                      {paidAmount > 0 && (
                        <>
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Paid Amount:</span>
                            <span className="font-mono">{currency.symbol} {paidAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold text-red-600 border-t border-dashed border-zinc-300 pt-1">
                            <span>Balance Due:</span>
                            <span className="font-mono">{currency.symbol} {balanceDue.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg text-xs bg-orange-50/50 border border-orange-200/80 text-zinc-800">
                    <span className="font-bold text-orange-600">In Words: </span>
                    <span className="font-medium italic text-zinc-800">{numberToWords(totalAmount)}</span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-200 flex items-end justify-between text-xs bg-white">
                  <div className="max-w-md space-y-1 text-[11px] text-zinc-600">
                    <p className="font-bold uppercase tracking-wider text-orange-600">Terms & Conditions</p>
                    <p>{terms}</p>
                    <p className="italic pt-1 text-zinc-500">{notes}</p>
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
          </div>
        </div>
      )}
    </div>
  );
};
