import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  CreditCard,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sparkles,
  FileSignature,
} from 'lucide-react';
import { useInvoice } from '../../context/InvoiceContext';
import { CompanyProfile, PaymentDetails } from '../../types/invoice';
import { ZoolyumLogo } from '../common/ZoolyumLogo';
import { CustomLogoUploader } from '../common/CustomLogoUploader';
import { CustomSignatureUploader } from '../common/CustomSignatureUploader';

export const SettingsModal: React.FC = () => {
  const {
    companyProfile,
    updateCompanyProfile,
    exportToJSON,
    importFromJSON,
    resetToSampleData,
  } = useInvoice();

  const [formData, setFormData] = useState<CompanyProfile>(companyProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importFromJSON(content);
      if (ok) {
        setImportError(null);
        alert('Data successfully restored from backup!');
      } else {
        setImportError('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Company Profile & Invoicing Setup
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure header brand information, bank accounts, default notes and data backup.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Information */}
        <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span>Brand & Organization Details</span>
            </h2>
            <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Preview:</span>
              <ZoolyumLogo size="sm" customLogoUrl={formData.logoUrl} customName={formData.name} />
            </div>
          </div>

          {/* Custom Logo PNG Upload Section */}
          <div className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60">
            <CustomLogoUploader
              currentLogoUrl={formData.logoUrl}
              onLogoChange={(newLogoUrl) => {
                setFormData((prev) => ({ ...prev, logoUrl: newLogoUrl }));
                updateCompanyProfile({ logoUrl: newLogoUrl });
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Company / Brand Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Official Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Billing Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Office Address (Dhaka, Bangladesh)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tax BIN / VAT Registration No.
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Banking & Mobile Financial Details */}
        <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <span>Bank & Payment Gateway Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Primary Bank Name
              </label>
              <input
                type="text"
                value={formData.defaultPaymentDetails.bankName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultPaymentDetails: {
                      ...formData.defaultPaymentDetails,
                      bankName: e.target.value,
                    },
                  })
                }
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                value={formData.defaultPaymentDetails.accountNumber || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultPaymentDetails: {
                      ...formData.defaultPaymentDetails,
                      accountNumber: e.target.value,
                    },
                  })
                }
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Branch & Routing Number
              </label>
              <input
                type="text"
                value={formData.defaultPaymentDetails.branch || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultPaymentDetails: {
                      ...formData.defaultPaymentDetails,
                      branch: e.target.value,
                    },
                  })
                }
                placeholder="e.g. Mirpur Branch, Routing: 225261738"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                bKash / Nagad / Rocket Merchant No.
              </label>
              <input
                type="text"
                value={formData.defaultPaymentDetails.mobileWalletNumber || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultPaymentDetails: {
                      ...formData.defaultPaymentDetails,
                      mobileWalletNumber: e.target.value,
                    },
                  })
                }
                placeholder="01601000950 (bKash / Nagad)"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Authorized Signature & Stamp Section */}
        <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-orange-500" />
              <span>Authorized Signature & Stamp Setup</span>
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Appears on generated invoices and PDF documents
            </span>
          </div>

          <CustomSignatureUploader
            signatureImageUrl={formData.signatureImageUrl}
            signerName={formData.authorizedSignerName || ''}
            signerTitle={formData.authorizedSignerTitle || 'Authorized Signature'}
            companyName={formData.name || 'Your Company'}
            onSignatureChange={(url) => setFormData((prev) => ({ ...prev, signatureImageUrl: url }))}
            onSignerNameChange={(name) => setFormData((prev) => ({ ...prev, authorizedSignerName: name }))}
            onSignerTitleChange={(title) => setFormData((prev) => ({ ...prev, authorizedSignerTitle: title }))}
          />
        </div>

        {/* Default Notes & Terms */}
        <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            Default Notes & Payment Terms
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Default Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={formData.defaultTerms}
                onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Default Client Thank You Note
              </label>
              <textarea
                rows={2}
                value={formData.defaultNotes}
                onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Company Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Backup & Restore Data Section */}
      <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-orange-500" />
          <span>Data Backup, Export & Factory Reset</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={exportToJSON}
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-left transition flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-orange-500" />
                <span>Download JSON Backup</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Export all invoices & clients to a file.</p>
            </div>
          </button>

          <label className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-left transition flex flex-col justify-between cursor-pointer">
            <div>
              <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>Restore from JSON</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Import invoices from JSON file.</p>
            </div>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all invoices and clients to Zoolyum sample dataset?')) {
                resetToSampleData();
              }
            }}
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/40 text-left transition flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sample Data</span>
              </div>
              <p className="text-[11px] text-red-500/80 mt-1">Reload default Zoolyum sample invoices.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
