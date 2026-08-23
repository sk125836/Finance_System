import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Invoice, ClientVendor, CompanyProfile, FilterOptions, InvoiceStatus, ReminderLog, AutomationSettings, Expense, ExpenseCategory } from '../types/invoice';
import { DEFAULT_ZOOLYUM_PROFILE, INITIAL_CLIENTS, INITIAL_INVOICES, INITIAL_EXPENSES, SUPPORTED_CURRENCIES } from '../types/mockData';
import { DEFAULT_AUTOMATION_SETTINGS, ReminderTemplateType, getInvoicesRequiringReminders, generateEmailContent } from '../utils/reminderService';
import { applyDynamicTheme, extractDominantColor, generatePaletteFromPrimary, BrandPalette } from '../utils/colorExtractor';

interface DashboardMetrics {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalInvoicesCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  draftCount: number;
  avgInvoiceValue: number;
  collectionRate: number; // percentage
  // Expense Metrics
  totalExpenses: number;
  totalPaidExpenses: number;
  totalPendingExpenses: number;
  netProfit: number; // totalPaid - totalPaidExpenses
  netInvoicedProfit: number; // totalInvoiced - totalExpenses
  expensesCount: number;
}

interface InvoiceContextType {
  invoices: Invoice[];
  clients: ClientVendor[];
  expenses: Expense[];
  companyProfile: CompanyProfile;
  activeCurrency: { symbol: string; code: string; name: string };
  setActiveCurrency: (currency: { symbol: string; code: string; name: string }) => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  resetFilters: () => void;
  
  // Actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => Invoice;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  
  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Expense;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  exportExpensesToCSV: (selectedExpenses?: Expense[]) => void;
  exportExpensesToExcel: (selectedExpenses?: Expense[]) => void;
  
  // Client Actions
  addClient: (client: Omit<ClientVendor, 'id' | 'totalBilled' | 'invoicesCount'>) => ClientVendor;
  updateClient: (id: string, client: Partial<ClientVendor>) => void;
  deleteClient: (id: string) => void;
  
  // Company Profile Actions
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  brandPalette: BrandPalette;
  setBrandColor: (hexColor: string) => void;
  extractAndApplyLogoColor: (logoUrl: string) => Promise<string>;

  // Reminder & Automated Notification Actions
  automationSettings: AutomationSettings;
  updateAutomationSettings: (settings: Partial<AutomationSettings>) => void;
  recordReminderSent: (invoiceId: string, log: Omit<ReminderLog, 'id' | 'sentAt'>) => void;
  sendBulkReminders: (invoiceIds: string[], templateType?: ReminderTemplateType) => Promise<number>;
  selectedInvoiceForReminder: Invoice | null;
  setSelectedInvoiceForReminder: (invoice: Invoice | null) => void;
  attentionSummary: {
    overdueInvoices: Invoice[];
    dueTodayInvoices: Invoice[];
    approachingInvoices: Invoice[];
    allAttentionInvoices: Invoice[];
    totalOverdueAmount: number;
    totalAttentionAmount: number;
  };

  // Search & Navigation
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  
  // Data Export & Calculation
  filteredInvoices: Invoice[];
  metrics: DashboardMetrics;
  exportToCSV: (selectedInvoices?: Invoice[]) => void;
  exportToExcelData: (selectedInvoices?: Invoice[]) => void;
  exportToJSON: () => void;
  importFromJSON: (jsonData: string) => boolean;
  resetToSampleData: () => void;
}

const defaultFilters: FilterOptions = {
  searchQuery: '',
  status: 'all',
  vendorId: 'all',
  dateRange: 'all',
  sortBy: 'date-desc',
};

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage initialization with mock fallback and legacy defaults migration
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('zoolyum_invoices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((inv: Invoice) => {
            if (inv.company) {
              const updatedCompany = { ...inv.company };
              if (updatedCompany.authorizedSignerName === 'Sakib Chowdhury' || !updatedCompany.authorizedSignerName) {
                updatedCompany.authorizedSignerName = 'John Dewey';
              }
              if (updatedCompany.name === 'Zoolyum' || updatedCompany.name === 'Zoolyum Agency Ltd.' || !updatedCompany.name) {
                updatedCompany.name = 'Your Company';
              }
              if (
                updatedCompany.address === 'Mirpur 11, Dhaka-1216' ||
                updatedCompany.address === 'Mirpur 11, Dhaka' ||
                updatedCompany.address === 'Mirpur 11, Dhaka-1216, Bangladesh' ||
                !updatedCompany.address
              ) {
                updatedCompany.address = 'Mirpur 10, Dhaka-1216';
              }
              return { ...inv, company: updatedCompany };
            }
            return inv;
          });
        }
      }
      return INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [clients, setClients] = useState<ClientVendor[]>(() => {
    try {
      const saved = localStorage.getItem('zoolyum_clients');
      return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('zoolyum_expenses');
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('zoolyum_company_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically migrate legacy default values if present in stored localStorage
        if (parsed.authorizedSignerName === 'Sakib Chowdhury' || !parsed.authorizedSignerName) {
          parsed.authorizedSignerName = 'John Dewey';
        }
        if (parsed.name === 'Zoolyum' || parsed.name === 'Zoolyum Agency Ltd.' || !parsed.name) {
          parsed.name = 'Your Company';
        }
        if (
          parsed.address === 'Mirpur 11, Dhaka-1216' ||
          parsed.address === 'Mirpur 11, Dhaka' ||
          parsed.address === 'Mirpur 11, Dhaka-1216, Bangladesh' ||
          !parsed.address
        ) {
          parsed.address = 'Mirpur 10, Dhaka-1216';
        }
        const merged = { ...DEFAULT_ZOOLYUM_PROFILE, ...parsed };
        localStorage.setItem('zoolyum_company_profile', JSON.stringify(merged));
        return merged;
      }
      return DEFAULT_ZOOLYUM_PROFILE;
    } catch {
      return DEFAULT_ZOOLYUM_PROFILE;
    }
  });

  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(() => {
    try {
      const saved = localStorage.getItem('zoolyum_automation_settings');
      return saved ? JSON.parse(saved) : DEFAULT_AUTOMATION_SETTINGS;
    } catch {
      return DEFAULT_AUTOMATION_SETTINGS;
    }
  });

  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<Invoice | null>(null);

  const [activeCurrency, setActiveCurrency] = useState<{ symbol: string; code: string; name: string }>(
    SUPPORTED_CURRENCIES[0]
  );

  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Dynamic Brand Palette derived from company profile brand color
  const brandPalette = useMemo(() => {
    const color = companyProfile.brandColor || '#ea580c';
    return generatePaletteFromPrimary(color);
  }, [companyProfile.brandColor]);

  // Apply theme dynamically whenever brand color changes
  useEffect(() => {
    applyDynamicTheme(companyProfile.brandColor || '#ea580c');
  }, [companyProfile.brandColor]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('zoolyum_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('zoolyum_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('zoolyum_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('zoolyum_company_profile', JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem('zoolyum_automation_settings', JSON.stringify(automationSettings));
  }, [automationSettings]);

  const updateAutomationSettings = (newSettings: Partial<AutomationSettings>) => {
    setAutomationSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Record a sent reminder for an invoice
  const recordReminderSent = (invoiceId: string, log: Omit<ReminderLog, 'id' | 'sentAt'>) => {
    const timestamp = new Date().toISOString();
    const newLog: ReminderLog = {
      ...log,
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      sentAt: timestamp,
    };

    setInvoices((prevInvoices) =>
      prevInvoices.map((inv) => {
        if (inv.id === invoiceId) {
          const currentLogs = inv.remindersSent || [];
          return {
            ...inv,
            remindersSent: [newLog, ...currentLogs],
            lastReminderSentAt: timestamp,
          };
        }
        return inv;
      })
    );
  };

  // Send bulk reminders
  const sendBulkReminders = async (
    invoiceIds: string[],
    templateType?: ReminderTemplateType
  ): Promise<number> => {
    const timestamp = new Date().toISOString();
    let count = 0;

    setInvoices((prevInvoices) =>
      prevInvoices.map((inv) => {
        if (invoiceIds.includes(inv.id)) {
          const emailData = generateEmailContent(inv, templateType);
          const newLog: ReminderLog = {
            id: `rem-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            sentAt: timestamp,
            recipientEmail: emailData.recipientEmail,
            recipientName: emailData.recipientName,
            subject: emailData.subject,
            type: emailData.templateType,
            channel: 'email',
            notes: `Batch automated reminder processed via Zoolyum Mailer Hub.`,
          };
          count++;
          return {
            ...inv,
            remindersSent: [newLog, ...(inv.remindersSent || [])],
            lastReminderSentAt: timestamp,
          };
        }
        return inv;
      })
    );

    return count;
  };

  // Calculate live attention summary
  const attentionSummary = useMemo(() => {
    return getInvoicesRequiringReminders(invoices, automationSettings);
  }, [invoices, automationSettings]);

  // Recalculate client billed totals whenever invoices change
  useEffect(() => {
    setClients((prevClients) =>
      prevClients.map((client) => {
        const clientInvoices = invoices.filter(
          (inv) => inv.client.id === client.id || inv.client.name.toLowerCase() === client.name.toLowerCase()
        );
        const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        return {
          ...client,
          totalBilled,
          invoicesCount: clientInvoices.length,
        };
      })
    );
  }, [invoices]);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    const newId = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newInvoice: Invoice = {
      ...invoiceData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // If client is new, automatically add client
    if (invoiceData.client.name) {
      const exists = clients.some(
        (c) => c.name.toLowerCase() === invoiceData.client.name.toLowerCase()
      );
      if (!exists) {
        const newClient: ClientVendor = {
          id: `client-${Date.now()}`,
          name: invoiceData.client.name,
          company: invoiceData.client.company || '',
          email: invoiceData.client.email || '',
          phone: invoiceData.client.phone || '',
          address: invoiceData.client.address || '',
          taxId: invoiceData.client.taxId || '',
          totalBilled: invoiceData.totalAmount,
          invoicesCount: 1,
        };
        setClients((prev) => [newClient, ...prev]);
      }
    }

    return newInvoice;
  };

  const updateInvoice = (id: string, updatedFields: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              ...updatedFields,
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const duplicateInvoice = (id: string): Invoice => {
    const target = invoices.find((inv) => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newInvoice: Invoice = {
      ...target,
      id: `inv-${Date.now().toString(36)}`,
      invoiceNumber: `${target.invoiceNumber}-COPY${randomSuffix}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      paidAmount: 0,
      balanceDue: target.totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const isPaid = status === 'paid';
          return {
            ...inv,
            status,
            paidAmount: isPaid ? inv.totalAmount : status === 'draft' ? 0 : inv.paidAmount,
            balanceDue: isPaid ? 0 : inv.totalAmount - (status === 'draft' ? 0 : inv.paidAmount),
            updatedAt: new Date().toISOString(),
          };
        }
        return inv;
      })
    );
  };

  const addClient = (clientData: Omit<ClientVendor, 'id' | 'totalBilled' | 'invoicesCount'>): ClientVendor => {
    const newClient: ClientVendor = {
      ...clientData,
      id: `client-${Date.now()}`,
      totalBilled: 0,
      invoicesCount: 0,
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updatedFields: Partial<ClientVendor>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedFields } : c))
    );
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  // Expense CRUD Actions
  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense => {
    const newId = `exp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newExpense: Expense = {
      ...expenseData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpense = (id: string, updatedFields: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              ...updatedFields,
              updatedAt: new Date().toISOString(),
            }
          : exp
      )
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  const exportExpensesToCSV = (selectedExpenses?: Expense[]) => {
    const listToExport = selectedExpenses || expenses;
    if (listToExport.length === 0) return;

    const headers = [
      'Expense ID',
      'Title / Description',
      'Category',
      'Amount',
      'Currency',
      'Date',
      'Vendor / Payee',
      'Payment Method',
      'Status',
      'Notes',
    ];

    const rows = listToExport.map((exp) => [
      `"${exp.id}"`,
      `"${(exp.title || '').replace(/"/g, '""')}"`,
      `"${(exp.category || '').toUpperCase()}"`,
      exp.amount,
      `"${exp.currency?.code || 'BDT'}"`,
      `"${exp.date || ''}"`,
      `"${(exp.payeeVendor || '').replace(/"/g, '""')}"`,
      `"${(exp.paymentMethod || '').toUpperCase()}"`,
      `"${(exp.status || '').toUpperCase()}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ]);

    const safeFileName = (companyProfile.name || 'Zoolyum').replace(/[^a-zA-Z0-9_-]/g, '_');
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_Expenses_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportExpensesToExcel = (selectedExpenses?: Expense[]) => {
    const listToExport = selectedExpenses || expenses;
    if (listToExport.length === 0) return;

    const tableRows = listToExport.map((exp) => `
      <tr>
        <td>${exp.id}</td>
        <td><b>${exp.title}</b></td>
        <td>${exp.category.toUpperCase()}</td>
        <td style="font-weight:bold; color:#ea580c;">${exp.currency.symbol} ${exp.amount.toLocaleString()}</td>
        <td>${exp.date}</td>
        <td>${exp.payeeVendor || 'N/A'}</td>
        <td>${exp.paymentMethod.toUpperCase()}</td>
        <td>${exp.status.toUpperCase()}</td>
        <td>${exp.notes || ''}</td>
      </tr>
    `).join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #ea580c; color: white; padding: 10px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
        </style>
      </head>
      <body>
        <h2>${companyProfile.name || 'Company'} - Official Expense Ledger</h2>
        <p>Report Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Expense ID</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Vendor / Payee</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const safeFileName = (companyProfile.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_Expenses_Ledger_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateCompanyProfile = (profile: Partial<CompanyProfile>) => {
    setCompanyProfile((prev) => {
      const nextProfile = { ...prev, ...profile };
      // If a brand color is supplied, immediately apply
      if (profile.brandColor) {
        applyDynamicTheme(profile.brandColor);
      }
      return nextProfile;
    });

    // If logo was changed and no explicit brandColor was provided, auto extract
    if (profile.logoUrl && !profile.brandColor) {
      extractDominantColor(profile.logoUrl).then(({ primary, brandPalette: newPal }) => {
        setCompanyProfile((prev) => ({
          ...prev,
          brandColor: primary,
          brandColorPalette: newPal,
        }));
        applyDynamicTheme(newPal);
      });
    } else if (profile.logoUrl === '' && !profile.brandColor) {
      // If logo removed, reset to default brand orange
      setCompanyProfile((prev) => ({
        ...prev,
        brandColor: '#ea580c',
      }));
      applyDynamicTheme('#ea580c');
    }
  };

  const setBrandColor = (hexColor: string) => {
    const palette = applyDynamicTheme(hexColor);
    setCompanyProfile((prev) => ({
      ...prev,
      brandColor: hexColor,
      brandColorPalette: palette,
    }));
  };

  const extractAndApplyLogoColor = async (logoUrl: string): Promise<string> => {
    try {
      const { primary, brandPalette: newPal } = await extractDominantColor(logoUrl);
      setCompanyProfile((prev) => ({
        ...prev,
        logoUrl,
        brandColor: primary,
        brandColorPalette: newPal,
      }));
      applyDynamicTheme(newPal);
      return primary;
    } catch {
      return '#ea580c';
    }
  };

  // Filtered invoices logic
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Search query: search in invoiceNumber, client name, client company, client email, items description
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.client.name.toLowerCase().includes(q) ||
          (inv.client.company && inv.client.company.toLowerCase().includes(q)) ||
          inv.client.email.toLowerCase().includes(q) ||
          inv.client.phone.includes(q) ||
          inv.totalAmount.toString().includes(q) ||
          inv.items.some((item) => item.description.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((inv) => inv.status === filters.status);
    }

    // Vendor / Client filter
    if (filters.vendorId && filters.vendorId !== 'all') {
      const selectedClient = clients.find((c) => c.id === filters.vendorId);
      result = result.filter((inv) => {
        if (inv.client.id && inv.client.id === filters.vendorId) return true;
        if (selectedClient && inv.client.name.toLowerCase() === selectedClient.name.toLowerCase()) return true;
        if (inv.client.name.toLowerCase() === filters.vendorId.toLowerCase()) return true;
        return false;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      result = result.filter((inv) => {
        const invDate = new Date(inv.issueDate);
        if (filters.dateRange === 'today') {
          return inv.issueDate === todayStr;
        }
        if (filters.dateRange === 'this-week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return invDate >= oneWeekAgo && invDate <= now;
        }
        if (filters.dateRange === 'this-month') {
          return (
            invDate.getFullYear() === now.getFullYear() &&
            invDate.getMonth() === now.getMonth()
          );
        }
        if (filters.dateRange === 'this-quarter') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const invQuarter = Math.floor(invDate.getMonth() / 3);
          return (
            invDate.getFullYear() === now.getFullYear() &&
            invQuarter === currentQuarter
          );
        }
        if (filters.dateRange === 'this-year') {
          return invDate.getFullYear() === now.getFullYear();
        }
        if (filters.dateRange === 'custom') {
          if (filters.startDate && inv.issueDate < filters.startDate) return false;
          if (filters.endDate && inv.issueDate > filters.endDate) return false;
          return true;
        }
        return true;
      });
    }

    // Amount range
    if (filters.minAmount !== undefined && filters.minAmount > 0) {
      result = result.filter((inv) => inv.totalAmount >= (filters.minAmount || 0));
    }
    if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
      result = result.filter((inv) => inv.totalAmount <= (filters.maxAmount || Infinity));
    }

    // Sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'date-desc') {
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      }
      if (filters.sortBy === 'date-asc') {
        return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      }
      if (filters.sortBy === 'amount-desc') {
        return b.totalAmount - a.totalAmount;
      }
      if (filters.sortBy === 'amount-asc') {
        return a.totalAmount - b.totalAmount;
      }
      if (filters.sortBy === 'vendor-asc') {
        return a.client.name.localeCompare(b.client.name);
      }
      if (filters.sortBy === 'number-desc') {
        return b.invoiceNumber.localeCompare(a.invoiceNumber);
      }
      return 0;
    });

    return result;
  }, [invoices, filters]);

  // Comprehensive financial metrics
  const metrics: DashboardMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let draftCount = 0;

    invoices.forEach((inv) => {
      totalInvoiced += inv.totalAmount;
      totalPaid += inv.paidAmount;

      if (inv.status === 'paid') {
        paidCount++;
      } else if (inv.status === 'pending') {
        pendingCount++;
        totalPending += inv.balanceDue;
      } else if (inv.status === 'overdue') {
        overdueCount++;
        totalOverdue += inv.balanceDue;
      } else if (inv.status === 'draft') {
        draftCount++;
      }
    });

    // Expenses calculations
    let totalExpenses = 0;
    let totalPaidExpenses = 0;
    let totalPendingExpenses = 0;

    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
      if (exp.status === 'paid') {
        totalPaidExpenses += exp.amount;
      } else {
        totalPendingExpenses += exp.amount;
      }
    });

    const netProfit = totalPaid - totalPaidExpenses;
    const netInvoicedProfit = totalInvoiced - totalExpenses;

    const totalInvoicesCount = invoices.length;
    const avgInvoiceValue = totalInvoicesCount > 0 ? totalInvoiced / totalInvoicesCount : 0;
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      totalInvoicesCount,
      paidCount,
      pendingCount,
      overdueCount,
      draftCount,
      avgInvoiceValue,
      collectionRate,
      totalExpenses,
      totalPaidExpenses,
      totalPendingExpenses,
      netProfit,
      netInvoicedProfit,
      expensesCount: expenses.length,
    };
  }, [invoices, expenses]);

  // Export to CSV
  const exportToCSV = (selectedInvoices?: Invoice[]) => {
    const listToExport = selectedInvoices || (filteredInvoices.length > 0 ? filteredInvoices : invoices);
    if (listToExport.length === 0) return;

    const headers = [
      'Invoice Number',
      'Issue Date',
      'Due Date',
      'Status',
      'Client / Vendor',
      'Company',
      'Email',
      'Phone',
      'Items Summary',
      'Subtotal',
      'Tax (%)',
      'Tax Amount',
      'Discount Amount',
      'Total Amount',
      'Paid Amount',
      'Balance Due',
      'Currency',
    ];

    const rows = listToExport.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.issueDate}"`,
      `"${inv.dueDate}"`,
      `"${inv.status.toUpperCase()}"`,
      `"${(inv.client?.name || '').replace(/"/g, '""')}"`,
      `"${(inv.client?.company || '').replace(/"/g, '""')}"`,
      `"${inv.client?.email || ''}"`,
      `"${inv.client?.phone || ''}"`,
      `"${(inv.items || []).map((i) => `${i.description} (x${i.quantity})`).join('; ').replace(/"/g, '""')}"`,
      inv.subtotal,
      `${inv.taxRate || 0}%`,
      inv.taxAmount || 0,
      inv.discountAmount || 0,
      inv.totalAmount,
      inv.paidAmount,
      inv.balanceDue,
      `"${inv.currency?.code || 'BDT'}"`,
    ]);

    const safeFileName = (companyProfile.name || 'Zoolyum').replace(/[^a-zA-Z0-9_-]/g, '_');
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_Invoices_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel compatible HTML format
  const exportToExcelData = (selectedInvoices?: Invoice[]) => {
    const listToExport = selectedInvoices || filteredInvoices;
    if (listToExport.length === 0) return;

    const tableRows = listToExport.map((inv) => `
      <tr>
        <td>${inv.invoiceNumber}</td>
        <td>${inv.issueDate}</td>
        <td>${inv.dueDate}</td>
        <td><b>${inv.status.toUpperCase()}</b></td>
        <td>${inv.client.name}</td>
        <td>${inv.client.company || ''}</td>
        <td>${inv.client.phone}</td>
        <td>${inv.client.email}</td>
        <td>${inv.items.map(i => `${i.description} (Qty: ${i.quantity})`).join('<br/>')}</td>
        <td>${inv.currency.symbol} ${inv.subtotal.toLocaleString()}</td>
        <td>${inv.taxRate}% (${inv.currency.symbol} ${inv.taxAmount.toLocaleString()})</td>
        <td>${inv.currency.symbol} ${inv.discountAmount.toLocaleString()}</td>
        <td style="font-weight:bold; color:#ea580c;">${inv.currency.symbol} ${inv.totalAmount.toLocaleString()}</td>
        <td style="color:#16a34a;">${inv.currency.symbol} ${inv.paidAmount.toLocaleString()}</td>
        <td style="color:#dc2626;">${inv.currency.symbol} ${inv.balanceDue.toLocaleString()}</td>
      </tr>
    `).join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${companyProfile.name || 'Company'} Invoices</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #ff5400; color: white; padding: 10px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
        </style>
      </head>
      <body>
        <h2>${companyProfile.name || 'Company'} - ${companyProfile.tagline || 'Billing Ledger'}</h2>
        <p>Report Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Client / Vendor</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>VAT/Tax</th>
              <th>Discount</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Balance Due</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const safeFileName = (companyProfile.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_Billing_Sheet_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const safeFileName = (companyProfile.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const data = {
      companyProfile,
      invoices,
      clients,
      expenses,
      exportDate: new Date().toISOString(),
      app: `${companyProfile.name || 'Company'} Invoice Generator & Hub`,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.invoices && Array.isArray(parsed.invoices)) {
        setInvoices(parsed.invoices);
      }
      if (parsed.clients && Array.isArray(parsed.clients)) {
        setClients(parsed.clients);
      }
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        setExpenses(parsed.expenses);
      }
      if (parsed.companyProfile) {
        setCompanyProfile(parsed.companyProfile);
      }
      return true;
    } catch (e) {
      console.error('Failed to import JSON data', e);
      return false;
    }
  };

  const resetToSampleData = () => {
    setInvoices(INITIAL_INVOICES);
    setClients(INITIAL_CLIENTS);
    setExpenses(INITIAL_EXPENSES);
    setCompanyProfile(DEFAULT_ZOOLYUM_PROFILE);
    localStorage.removeItem('zoolyum_invoices');
    localStorage.removeItem('zoolyum_clients');
    localStorage.removeItem('zoolyum_expenses');
    localStorage.removeItem('zoolyum_company_profile');
  };

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        clients,
        expenses,
        companyProfile,
        activeCurrency,
        setActiveCurrency,
        filters,
        setFilters,
        resetFilters,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        duplicateInvoice,
        updateInvoiceStatus,
        addExpense,
        updateExpense,
        deleteExpense,
        exportExpensesToCSV,
        exportExpensesToExcel,
        addClient,
        updateClient,
        deleteClient,
        updateCompanyProfile,
        brandPalette,
        setBrandColor,
        extractAndApplyLogoColor,
        automationSettings,
        updateAutomationSettings,
        recordReminderSent,
        sendBulkReminders,
        selectedInvoiceForReminder,
        setSelectedInvoiceForReminder,
        attentionSummary,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        filteredInvoices,
        metrics,
        exportToCSV,
        exportToExcelData,
        exportToJSON,
        importFromJSON,
        resetToSampleData,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoice = (): InvoiceContextType => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};
