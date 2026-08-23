import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Share2,
  Send,
  Mail,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { useInvoice } from '../../context/InvoiceContext';
import { exportElementToPDF, formatCurrency, numberToWords, triggerPrint } from '../../utils/pdfGenerator';
import { ZoolyumLogo } from '../common/ZoolyumLogo';
import { AuthorizedSignatureDisplay } from '../common/AuthorizedSignatureDisplay';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onEdit: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onEdit,
}) => {
  const { updateInvoiceStatus, deleteInvoice, duplicateInvoice, setSelectedInvoiceForReminder, companyProfile } = useInvoice();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!invoice) return null;

  const currentCompanyName = invoice.company?.name || companyProfile.name || 'Your Company';
  const currentSignerName = invoice.company?.authorizedSignerName || companyProfile.authorizedSignerName || 'John Dewey';
  const currentSignerTitle = invoice.company?.authorizedSignerTitle || companyProfile.authorizedSignerTitle || 'Authorized Signature';
  const currentSignatureImage = invoice.company?.signatureImageUrl || companyProfile.signatureImageUrl;

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      await exportElementToPDF(
        'modal-invoice-render',
        `Invoice_${invoice.invoiceNumber}_${invoice.client.name.replace(/\s+/g, '_')}`
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleCopySummary = () => {
    const text = `Invoice #${invoice.invoiceNumber}\nClient: ${invoice.client.name}\nTotal: ${invoice.currency.symbol} ${invoice.totalAmount.toLocaleString()}\nStatus: ${invoice.status.toUpperCase()}\nDue Date: ${invoice.dueDate}\nIssued by ${currentCompanyName} (${invoice.company?.phone || companyProfile.phone || '01601000950'})`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Controls */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-base text-orange-500">
              {invoice.invoiceNumber}
            </span>
            <select
              value={invoice.status}
              onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value as InvoiceStatus)}
              aria-label="Invoice status"
              className="text-xs font-bold uppercase px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <option value="paid">✓ Paid</option>
              <option value="pending">● Pending</option>
              <option value="overdue">! Overdue</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && (
              <button
                onClick={() => {
                  onClose();
                  setSelectedInvoiceForReminder(invoice);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-orange-500/15 hover:bg-orange-500 text-orange-600 hover:text-white dark:text-orange-400 dark:hover:text-white transition cursor-pointer border border-orange-500/30"
                title="Send automated payment reminder"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reminder</span>
              </button>
            )}

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              title="Copy invoice summary text"
            >
              <Share2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>{copiedLink ? 'Copied!' : 'Share Info'}</span>
            </button>

            <button
              onClick={triggerPrint}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 text-white shadow-md transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Generating...' : 'PDF Download'}</span>
            </button>

            <button
              onClick={() => {
                onEdit(invoice);
                onClose();
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Paper Document */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950/80 flex justify-center custom-scrollbar">
          <div
            id="modal-invoice-render"
            className="w-[800px] min-h-[1100px] p-12 bg-white text-zinc-900 rounded-xl shadow-2xl border border-zinc-200 font-sans flex flex-col justify-between select-text"
            style={{ backgroundColor: '#ffffff', color: '#18181b' }}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-200 bg-white">
                <div className="space-y-1 max-w-[460px]">
                  <div className="min-h-[52px] flex items-center justify-start pb-1">
                    <ZoolyumLogo
                      size="lg"
                      variant="full"
                      fullTagline={true}
                      customLogoUrl={invoice.company?.logoUrl}
                      customName={invoice.company?.name}
                    />
                  </div>

                  <div className="text-xs pt-1 space-y-1 text-zinc-600 font-medium leading-relaxed">
                    <p>{invoice.company.address || 'Mirpur 10, Dhaka-1216'}</p>
                    <p><span className="font-semibold text-zinc-700">Phone:</span> {invoice.company.phone || '01601000950'}</p>
                    <p><span className="font-semibold text-zinc-700">Email:</span> {invoice.company.email || 'contact@zoolyum.com'}</p>
                    <p>{invoice.company.taxId || 'BIN: 004928194-0101'} | {invoice.company.website || 'www.zoolyum.com'}</p>
                  </div>
                </div>

                <div className="text-right space-y-1.5 shrink-0">
                  <h3 className={`text-2xl font-mono font-black pt-1 whitespace-nowrap tracking-tight ${
                    invoice.templateStyle === 'modern-orange' ? 'text-orange-600' : 'text-zinc-900'
                  }`}>
                    #{invoice.invoiceNumber}
                  </h3>
                  <div className="text-xs space-y-1 pt-1 text-zinc-600 font-medium whitespace-nowrap">
                    <p><span className="font-bold text-zinc-800">Issue Date:</span> {invoice.issueDate}</p>
                    <p><span className="font-bold text-zinc-800">Due Date:</span> {invoice.dueDate}</p>
                  </div>

                  <div className="pt-2">
                    {invoice.status === 'paid' && (
                      <span className="inline-block px-3 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-extrabold text-xs border border-emerald-300 uppercase tracking-wider whitespace-nowrap">
                        ✓ PAID IN FULL
                      </span>
                    )}
                    {invoice.status === 'pending' && (
                      <span className="inline-block px-3 py-0.5 rounded-md bg-amber-100 text-amber-700 font-extrabold text-xs border border-amber-300 uppercase tracking-wider whitespace-nowrap">
                        ● PENDING PAYMENT
                      </span>
                    )}
                    {invoice.status === 'overdue' && (
                      <span className="inline-block px-3 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-xs border border-red-300 uppercase tracking-wider whitespace-nowrap">
                        ! OVERDUE
                      </span>
                    )}
                    {invoice.status === 'draft' && (
                      <span className="inline-block px-3 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-extrabold text-xs border border-zinc-300 uppercase tracking-wider whitespace-nowrap">
                        DRAFT
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Billed To / Payment instructions */}
              <div className="py-5 grid grid-cols-2 gap-8 border-b border-zinc-200 bg-white">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                    BILLED TO
                  </span>
                  <h4 className="text-base font-black mt-1 text-zinc-900">
                    {invoice.client.name}
                  </h4>
                  {invoice.client.company && (
                    <p className="text-xs font-bold text-zinc-700">{invoice.client.company}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-1">{invoice.client.address || 'Dhaka, Bangladesh'}</p>
                  <p className="text-xs text-zinc-600">{invoice.client.phone} {invoice.client.email ? `• ${invoice.client.email}` : ''}</p>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                    PAYMENT DETAILS
                  </span>
                  <p className="text-xs font-bold text-zinc-900">{invoice.paymentDetails?.bankName || 'City Bank PLC'}</p>
                  <p className="text-xs text-zinc-600">A/C: {invoice.paymentDetails?.accountNumber || '1102938475001'}</p>
                  {invoice.paymentDetails?.mobileWalletNumber && (
                    <p className="text-xs font-bold text-orange-600">{invoice.paymentDetails.mobileWalletNumber}</p>
                  )}
                  <p className="text-[11px] text-zinc-500">Ref: #{invoice.invoiceNumber}</p>
                </div>
              </div>

              {/* Items */}
              <div className="py-5 bg-white">
                <table className="w-full text-left text-xs bg-white">
                  <thead>
                    <tr className="border-b border-zinc-300 text-zinc-600 font-bold uppercase tracking-wider text-[10px] bg-white">
                      <th className="py-2.5 w-10 text-center">#</th>
                      <th className="py-2.5">Item & Description</th>
                      <th className="py-2.5 text-center w-16">Qty</th>
                      <th className="py-2.5 text-right w-28">Rate ({invoice.currency.symbol})</th>
                      <th className="py-2.5 text-right w-32">Amount ({invoice.currency.symbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="bg-white">
                        <td className="py-3 text-center text-zinc-400 font-mono">{idx + 1}</td>
                        <td className="py-3 font-bold text-zinc-900">{item.description}</td>
                        <td className="py-3 text-center font-bold text-zinc-800">{item.quantity}</td>
                        <td className="py-3 text-right font-mono text-zinc-700">{item.unitPrice.toLocaleString()}</td>
                        <td className="py-3 text-right font-mono font-black text-zinc-900">
                          {item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-4 flex justify-end border-t border-zinc-200 bg-white">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{invoice.currency.symbol} {invoice.subtotal.toLocaleString()}</span>
                  </div>
                  {invoice.taxRate > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Tax / VAT ({invoice.taxRate}%):</span>
                      <span className="font-mono font-semibold">+ {invoice.currency.symbol} {invoice.taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.discountRate > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount ({invoice.discountRate}%):</span>
                      <span className="font-mono">- {invoice.currency.symbol} {invoice.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black pt-2 border-t border-zinc-300 text-orange-600">
                    <span>Grand Total:</span>
                    <span className="font-mono">{invoice.currency.symbol} {invoice.totalAmount.toLocaleString()}</span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Paid Amount:</span>
                        <span className="font-mono">{invoice.currency.symbol} {invoice.paidAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-red-600 border-t border-dashed border-zinc-300 pt-1">
                        <span>Balance Due:</span>
                        <span className="font-mono">{invoice.currency.symbol} {invoice.balanceDue.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* In Words */}
              <div className="mt-4 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
                <span className="font-bold text-orange-600">In Words: </span>
                <span className="font-medium italic text-zinc-800">{numberToWords(invoice.totalAmount)}</span>
              </div>
            </div>

            {/* Terms & Signature */}
            <div className="pt-6 mt-6 border-t border-zinc-200 flex items-end justify-between text-xs bg-white">
              <div className="max-w-md space-y-1 text-zinc-600 text-[11px]">
                <p className="font-bold text-orange-600 uppercase tracking-wider">Terms & Notes</p>
                <p>{invoice.terms}</p>
                <p className="italic pt-0.5 text-zinc-500">{invoice.notes}</p>
              </div>

              <div className="text-right">
                <AuthorizedSignatureDisplay
                  signatureImageUrl={currentSignatureImage}
                  signerName={currentSignerName}
                  signerTitle={currentSignerTitle}
                  companyName={currentCompanyName}
                  theme="pdf"
                  align="right"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
