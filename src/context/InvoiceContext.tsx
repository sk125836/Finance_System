import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Invoice, ClientVendor, CompanyProfile, FilterOptions, InvoiceStatus, ReminderLog, AutomationSettings, Expense } from '../types/invoice';
import { DEFAULT_ZOOLYUM_PROFILE, INITIAL_CLIENTS, INITIAL_INVOICES, INITIAL_EXPENSES } from '../types/mockData';
import {
  CurrencyInfo,
  ExchangeRatesData,
  fetchLiveExchangeRates,
  convertCurrency,
  getExchangeRate,
  formatConvertedAmount,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES_FROM_BDT,
} from '../utils/currencyService';
import { DEFAULT_AUTOMATION_SETTINGS, ReminderTemplateType, getInvoicesRequiringReminders, generateEmailContent } from '../utils/reminderService';
import { applyDynamicTheme, extractDominantColor, generatePaletteFromPrimary, BrandPalette } from '../utils/colorExtractor';
import { useAuth } from './AuthContext';
import {
  syncInvoiceToSupabase,
  fetchInvoicesFromSupabase,
  deleteInvoiceFromSupabase,
  syncClientToSupabase,
  fetchClientsFromSupabase,
  deleteClientFromSupabase,
  syncExpenseToSupabase,
  fetchExpensesFromSupabase,
  deleteExpenseFromSupabase,
  syncCompanyProfileToSupabase,
  fetchCompanyProfileFromSupabase,
} from '../utils/supabaseSync';

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
  activeCurrency: CurrencyInfo;
  setActiveCurrency: (currency: CurrencyInfo) => void;
  // Live Currency Exchange & Conversion
  ratesData: ExchangeRatesData | null;
  exchangeRates: Record<string, number>;
  isRatesLoading: boolean;
  refreshExchangeRates: () => Promise<void>;
  convertAmount: (amount: number, fromCode?: string, toCode?: string) => number;
  formatConverted: (amount: number, fromCode?: string, targetCurrency?: { symbol: string; code: string }) => string;
  getRateBetween: (fromCode: string, toCode: string) => number;
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
  isDbConnected: boolean;
  refreshData: () => Promise<void>;
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
  const { user, token } = useAuth();

  // Storage key helper for user data isolation
  const getStorageKey = (prefix: string) => {
    return user?.id ? `${prefix}_user_${user.id}` : `${prefix}_guest`;
  };

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const key = user?.id ? `zoolyum_invoices_user_${user.id}` : 'zoolyum_invoices_guest';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [clients, setClients] = useState<ClientVendor[]>(() => {
    try {
      const key = user?.id ? `zoolyum_clients_user_${user.id}` : 'zoolyum_clients_guest';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const key = user?.id ? `zoolyum_expenses_user_${user.id}` : 'zoolyum_expenses_guest';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const key = user?.id ? `zoolyum_company_profile_user_${user.id}` : 'zoolyum_company_profile_guest';
      const saved = localStorage.getItem(key);
      if (saved) {
        return { ...DEFAULT_ZOOLYUM_PROFILE, ...JSON.parse(saved) };
      }
      return {
        ...DEFAULT_ZOOLYUM_PROFILE,
        name: user?.name ? `${user.name}'s Company` : 'Your Company',
        email: user?.email || DEFAULT_ZOOLYUM_PROFILE.email,
      };
    } catch {
      return DEFAULT_ZOOLYUM_PROFILE;
    }
  });

  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(() => {
    try {
      const key = user?.id ? `zoolyum_automation_user_${user.id}` : 'zoolyum_automation_guest';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : DEFAULT_AUTOMATION_SETTINGS;
    } catch {
      return DEFAULT_AUTOMATION_SETTINGS;
    }
  });

  const [isDbConnected, setIsDbConnected] = useState(false);
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<Invoice | null>(null);

  // Active Currency state
  const [activeCurrency, setActiveCurrency] = useState<CurrencyInfo>(
    SUPPORTED_CURRENCIES[0]
  );

  // Live Exchange Rates state
  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [isRatesLoading, setIsRatesLoading] = useState(false);

  // Fetch live exchange rates from Google / Open Exchange Rates
  const refreshExchangeRates = useCallback(async () => {
    setIsRatesLoading(true);
    try {
      const data = await fetchLiveExchangeRates();
      setRatesData(data);
    } catch (err) {
      console.warn('Failed to refresh exchange rates:', err);
    } finally {
      setIsRatesLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refreshExchangeRates();
    // Auto-refresh rates every 15 minutes
    const interval = setInterval(refreshExchangeRates, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshExchangeRates]);

  const exchangeRates = useMemo(() => {
    return ratesData?.rates || FALLBACK_RATES_FROM_BDT;
  }, [ratesData]);

  // Convert amount between currencies using live rates
  const convertAmount = useCallback(
    (amount: number, fromCode: string = 'BDT', toCode: string = activeCurrency.code): number => {
      return convertCurrency(amount, fromCode, toCode, exchangeRates);
    },
    [activeCurrency.code, exchangeRates]
  );

  // Format converted amount
  const formatConverted = useCallback(
    (
      amount: number,
      fromCode: string = 'BDT',
      targetCurrency: { symbol: string; code: string } = activeCurrency
    ): string => {
      const converted = convertCurrency(amount, fromCode, targetCurrency.code, exchangeRates);
      return formatConvertedAmount(converted, targetCurrency);
    },
    [activeCurrency, exchangeRates]
  );

  // Rate between two currencies helper
  const getRateBetween = useCallback(
    (fromCode: string, toCode: string): number => {
      return getExchangeRate(fromCode, toCode, exchangeRates);
    },
    [exchangeRates]
  );

  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Helper headers with auth token if logged in
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Load from Supabase & PostgreSQL database on user change or mount
  const fetchFromDatabase = async () => {
    try {
      // If user is not logged in, maintain current isolated guest state
      if (!user && !token) {
        setIsDbConnected(true);
        return;
      }

      // 1. First fetch directly from Supabase
      const [supaInvoices, supaClients, supaExpenses, supaProfile] = await Promise.all([
        fetchInvoicesFromSupabase(user?.id),
        fetchClientsFromSupabase(user?.id),
        fetchExpensesFromSupabase(user?.id),
        fetchCompanyProfileFromSupabase(user?.id),
      ]);

      let hasSupabaseData = false;

      if (supaInvoices && Array.isArray(supaInvoices)) {
        setInvoices(supaInvoices);
        hasSupabaseData = true;
      }

      if (supaClients && Array.isArray(supaClients)) {
        setClients(supaClients);
        hasSupabaseData = true;
      }

      if (supaExpenses && Array.isArray(supaExpenses)) {
        setExpenses(supaExpenses);
        hasSupabaseData = true;
      }

      if (supaProfile && supaProfile.name) {
        setCompanyProfile(supaProfile);
        hasSupabaseData = true;
      }

      // 2. Also fetch and keep backend synchronized
      const headers = getAuthHeaders();
      const [invRes, clientRes, expRes, profileRes] = await Promise.all([
        fetch('/api/invoices', { headers }),
        fetch('/api/clients', { headers }),
        fetch('/api/expenses', { headers }),
        fetch('/api/company-profile', { headers }),
      ]);

      if (!hasSupabaseData && invRes.ok) {
        const invData = await invRes.json();
        if (Array.isArray(invData)) {
          const formattedInvoices = invData.map((inv: any) => ({
            ...inv,
            subtotal: Number(inv.subtotal) || 0,
            taxRate: Number(inv.taxRate) || 0,
            taxAmount: Number(inv.taxAmount) || 0,
            discountRate: Number(inv.discountRate) || 0,
            discountAmount: Number(inv.discountAmount) || 0,
            shippingFee: Number(inv.shippingFee) || 0,
            totalAmount: Number(inv.totalAmount) || 0,
            paidAmount: Number(inv.paidAmount) || 0,
            balanceDue: Number(inv.balanceDue) || 0,
          }));
          setInvoices(formattedInvoices);
        }
      }

      if (!hasSupabaseData && clientRes.ok) {
        const clientData = await clientRes.json();
        if (Array.isArray(clientData)) {
          setClients(clientData.map((c: any) => ({
            ...c,
            totalBilled: Number(c.totalBilled) || 0,
            invoicesCount: Number(c.invoicesCount) || 0,
          })));
        }
      }

      if (!hasSupabaseData && expRes.ok) {
        const expData = await expRes.json();
        if (Array.isArray(expData)) {
          setExpenses(expData.map((e: any) => ({
            ...e,
            amount: Number(e.amount) || 0,
          })));
        }
      }

      if (!hasSupabaseData && profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData && profileData.name) {
          setCompanyProfile((prev) => ({ ...prev, ...profileData }));
        } else if (user) {
          setCompanyProfile((prev) => ({
            ...prev,
            name: user.name ? `${user.name}'s Company` : prev.name,
            email: user.email || prev.email,
          }));
        }
      }

      setIsDbConnected(true);
    } catch (err) {
      console.warn('Using fallback state:', err);
    }
  };

  // Switch local state cleanly whenever user logs in or out
  useEffect(() => {
    if (user?.id) {
      const invKey = `zoolyum_invoices_user_${user.id}`;
      const clKey = `zoolyum_clients_user_${user.id}`;
      const expKey = `zoolyum_expenses_user_${user.id}`;
      const profKey = `zoolyum_company_profile_user_${user.id}`;

      try {
        const localInv = localStorage.getItem(invKey);
        setInvoices(localInv ? JSON.parse(localInv) : []);

        const localCl = localStorage.getItem(clKey);
        setClients(localCl ? JSON.parse(localCl) : []);

        const localExp = localStorage.getItem(expKey);
        setExpenses(localExp ? JSON.parse(localExp) : []);

        const localProf = localStorage.getItem(profKey);
        setCompanyProfile(localProf ? JSON.parse(localProf) : {
          ...DEFAULT_ZOOLYUM_PROFILE,
          name: user.name ? `${user.name}'s Company` : 'Your Company',
          email: user.email || DEFAULT_ZOOLYUM_PROFILE.email,
        });
      } catch {
        setInvoices([]);
        setClients([]);
        setExpenses([]);
      }
    }
    fetchFromDatabase();
  }, [user?.id, token]);

  // Dynamic Brand Palette derived from company profile brand color
  const brandPalette = useMemo(() => {
    const color = companyProfile.brandColor || '#ea580c';
    return generatePaletteFromPrimary(color);
  }, [companyProfile.brandColor]);

  // Apply theme dynamically whenever brand color changes
  useEffect(() => {
    applyDynamicTheme(companyProfile.brandColor || '#ea580c');
  }, [companyProfile.brandColor]);

  // Sync to LocalStorage scoped to current user as resilient cache
  useEffect(() => {
    const key = user?.id ? `zoolyum_invoices_user_${user.id}` : 'zoolyum_invoices_guest';
    localStorage.setItem(key, JSON.stringify(invoices));
  }, [invoices, user?.id]);

  useEffect(() => {
    const key = user?.id ? `zoolyum_clients_user_${user.id}` : 'zoolyum_clients_guest';
    localStorage.setItem(key, JSON.stringify(clients));
  }, [clients, user?.id]);

  useEffect(() => {
    const key = user?.id ? `zoolyum_expenses_user_${user.id}` : 'zoolyum_expenses_guest';
    localStorage.setItem(key, JSON.stringify(expenses));
  }, [expenses, user?.id]);

  useEffect(() => {
    const key = user?.id ? `zoolyum_company_profile_user_${user.id}` : 'zoolyum_company_profile_guest';
    localStorage.setItem(key, JSON.stringify(companyProfile));
  }, [companyProfile, user?.id]);

  useEffect(() => {
    const key = user?.id ? `zoolyum_automation_user_${user.id}` : 'zoolyum_automation_guest';
    localStorage.setItem(key, JSON.stringify(automationSettings));
  }, [automationSettings, user?.id]);

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

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updatedReminders = [newLog, ...(inv.remindersSent || [])];
          const updatedInvoice = {
            ...inv,
            remindersSent: updatedReminders,
            lastReminderSentAt: timestamp,
            updatedAt: timestamp,
          };
          syncInvoiceToSupabase(updatedInvoice, user?.id);
          // Persist to PostgreSQL backend
          fetch('/api/invoices', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(updatedInvoice),
          }).catch(() => {});
          return updatedInvoice;
        }
        return inv;
      })
    );
  };

  // Bulk send reminder simulation
  const sendBulkReminders = async (
    invoiceIds: string[],
    templateType: ReminderTemplateType = 'approaching'
  ): Promise<number> => {
    let count = 0;
    const nowIso = new Date().toISOString();

    setInvoices((prev) =>
      prev.map((inv) => {
        if (invoiceIds.includes(inv.id)) {
          count++;
          const emailData = generateEmailContent(inv, templateType);
          const newLog: ReminderLog = {
            id: `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            sentAt: nowIso,
            recipientEmail: inv.client.email,
            recipientName: inv.client.name,
            subject: emailData.subject,
            type: templateType,
            channel: 'email',
            notes: 'Sent via automated batch scheduler',
          };
          const updatedInvoice = {
            ...inv,
            remindersSent: [newLog, ...(inv.remindersSent || [])],
            lastReminderSentAt: nowIso,
            updatedAt: nowIso,
          };
          syncInvoiceToSupabase(updatedInvoice, user?.id);
          fetch('/api/invoices', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(updatedInvoice),
          }).catch(() => {});
          return updatedInvoice;
        }
        return inv;
      })
    );

    return count;
  };

  // Calculate live attention summary with dynamic currency conversion
  const attentionSummary = useMemo(() => {
    const raw = getInvoicesRequiringReminders(invoices, automationSettings);
    
    // Convert amounts to active currency
    let totalOverdueConverted = 0;
    let totalAttentionConverted = 0;

    raw.overdueInvoices.forEach((inv) => {
      const invCur = inv.currency?.code || 'BDT';
      const amt = inv.balanceDue || inv.totalAmount;
      totalOverdueConverted += convertCurrency(amt, invCur, activeCurrency.code, exchangeRates);
    });

    raw.allAttentionInvoices.forEach((inv) => {
      const invCur = inv.currency?.code || 'BDT';
      const amt = inv.balanceDue || inv.totalAmount;
      totalAttentionConverted += convertCurrency(amt, invCur, activeCurrency.code, exchangeRates);
    });

    return {
      ...raw,
      totalOverdueAmount: totalOverdueConverted,
      totalAttentionAmount: totalAttentionConverted,
    };
  }, [invoices, automationSettings, activeCurrency.code, exchangeRates]);

  // Recalculate client billed totals whenever invoices change or active currency changes
  useEffect(() => {
    setClients((prevClients) =>
      prevClients.map((client) => {
        const clientInvoices = invoices.filter(
          (inv) => inv.client.id === client.id || inv.client.name.toLowerCase() === client.name.toLowerCase()
        );
        const totalBilled = clientInvoices.reduce((sum, inv) => {
          const invCur = inv.currency?.code || 'BDT';
          return sum + convertCurrency(inv.totalAmount, invCur, activeCurrency.code, exchangeRates);
        }, 0);
        return {
          ...client,
          totalBilled,
          invoicesCount: clientInvoices.length,
        };
      })
    );
  }, [invoices, activeCurrency.code, exchangeRates]);

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

    // 1. Sync to Supabase
    syncInvoiceToSupabase(newInvoice, user?.id);

    // 2. Sync to Backend Database
    fetch('/api/invoices', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newInvoice),
    }).catch((err) => console.error('Failed to post invoice to backend:', err));

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
        syncClientToSupabase(newClient, user?.id);
        fetch('/api/clients', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(newClient),
        }).catch(() => {});
      }
    }

    return newInvoice;
  };

  const updateInvoice = (id: string, updatedFields: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const updated = {
            ...inv,
            ...updatedFields,
            updatedAt: new Date().toISOString(),
          };
          syncInvoiceToSupabase(updated, user?.id);
          fetch('/api/invoices', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return inv;
      })
    );
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    deleteInvoiceFromSupabase(id);
    fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});
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
    syncInvoiceToSupabase(newInvoice, user?.id);
    fetch('/api/invoices', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newInvoice),
    }).catch(() => {});
    return newInvoice;
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const isPaid = status === 'paid';
          const updated = {
            ...inv,
            status,
            paidAmount: isPaid ? inv.totalAmount : status === 'draft' ? 0 : inv.paidAmount,
            balanceDue: isPaid ? 0 : inv.totalAmount - (status === 'draft' ? 0 : inv.paidAmount),
            updatedAt: new Date().toISOString(),
          };
          syncInvoiceToSupabase(updated, user?.id);
          fetch('/api/invoices', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
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
    syncClientToSupabase(newClient, user?.id);
    fetch('/api/clients', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newClient),
    }).catch(() => {});
    return newClient;
  };

  const updateClient = (id: string, updatedFields: Partial<ClientVendor>) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updatedFields };
          syncClientToSupabase(updated, user?.id);
          fetch('/api/clients', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return c;
      })
    );
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    deleteClientFromSupabase(id);
    fetch(`/api/clients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});
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
    syncExpenseToSupabase(newExpense, user?.id);
    fetch('/api/expenses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newExpense),
    }).catch(() => {});
    return newExpense;
  };

  const updateExpense = (id: string, updatedFields: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id === id) {
          const updated = {
            ...exp,
            ...updatedFields,
            updatedAt: new Date().toISOString(),
          };
          syncExpenseToSupabase(updated, user?.id);
          fetch('/api/expenses', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return exp;
      })
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    deleteExpenseFromSupabase(id);
    fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});
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
    const nextProfile = { ...companyProfile, ...profile };
    setCompanyProfile((prev) => {
      const merged = { ...prev, ...profile };
      if (profile.brandColor) {
        applyDynamicTheme(profile.brandColor);
      }
      return merged;
    });

    syncCompanyProfileToSupabase(nextProfile, user?.id);

    fetch('/api/company-profile', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(nextProfile),
    }).catch(() => {});

    if (profile.logoUrl && !profile.brandColor) {
      extractDominantColor(profile.logoUrl).then(({ primary, brandPalette: newPal }) => {
        const withColor = {
          ...nextProfile,
          brandColor: primary,
          brandColorPalette: newPal,
        };
        setCompanyProfile(withColor);
        syncCompanyProfileToSupabase(withColor, user?.id);
        applyDynamicTheme(newPal);
      });
    }
  };

  const setBrandColor = (hexColor: string) => {
    const palette = applyDynamicTheme(hexColor);
    setCompanyProfile((prev) => {
      const updated = {
        ...prev,
        brandColor: hexColor,
        brandColorPalette: palette,
      };
      syncCompanyProfileToSupabase(updated, user?.id);
      return updated;
    });
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

    if (filters.status !== 'all') {
      result = result.filter((inv) => inv.status === filters.status);
    }

    if (filters.vendorId && filters.vendorId !== 'all') {
      const selectedClient = clients.find((c) => c.id === filters.vendorId);
      result = result.filter((inv) => {
        if (inv.client.id && inv.client.id === filters.vendorId) return true;
        if (selectedClient && inv.client.name.toLowerCase() === selectedClient.name.toLowerCase()) return true;
        if (inv.client.name.toLowerCase() === filters.vendorId.toLowerCase()) return true;
        return false;
      });
    }

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

    if (filters.minAmount !== undefined && filters.minAmount > 0) {
      result = result.filter((inv) => inv.totalAmount >= (filters.minAmount || 0));
    }
    if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
      result = result.filter((inv) => inv.totalAmount <= (filters.maxAmount || Infinity));
    }

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
  }, [invoices, filters, clients]);

  // Financial metrics converted live to activeCurrency
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
      const invCur = inv.currency?.code || 'BDT';
      const invoicedInActive = convertCurrency(inv.totalAmount, invCur, activeCurrency.code, exchangeRates);
      const paidInActive = convertCurrency(inv.paidAmount, invCur, activeCurrency.code, exchangeRates);
      const dueInActive = convertCurrency(inv.balanceDue, invCur, activeCurrency.code, exchangeRates);

      totalInvoiced += invoicedInActive;
      if (inv.status === 'paid') {
        totalPaid += invoicedInActive;
        paidCount++;
      } else if (inv.status === 'pending') {
        totalPending += dueInActive;
        pendingCount++;
      } else if (inv.status === 'overdue') {
        totalOverdue += dueInActive;
        overdueCount++;
      } else if (inv.status === 'draft') {
        draftCount++;
      }
    });

    let totalExpenses = 0;
    let totalPaidExpenses = 0;
    let totalPendingExpenses = 0;

    expenses.forEach((exp) => {
      const expCur = exp.currency?.code || 'BDT';
      const expInActive = convertCurrency(exp.amount, expCur, activeCurrency.code, exchangeRates);
      totalExpenses += expInActive;
      if (exp.status === 'paid') {
        totalPaidExpenses += expInActive;
      } else {
        totalPendingExpenses += expInActive;
      }
    });

    const totalInvoicesCount = invoices.length;
    const avgInvoiceValue = totalInvoicesCount > 0 ? totalInvoiced / totalInvoicesCount : 0;
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
    const netProfit = totalPaid - totalPaidExpenses;
    const netInvoicedProfit = totalInvoiced - totalExpenses;

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
  }, [invoices, expenses, activeCurrency.code, exchangeRates]);

  const exportToCSV = (selectedInvoices?: Invoice[]) => {
    const listToExport = selectedInvoices || invoices;
    if (listToExport.length === 0) return;

    const headers = [
      'Invoice Number',
      'Issue Date',
      'Due Date',
      'Status',
      'Client Name',
      'Client Email',
      'Subtotal',
      'Tax Amount',
      'Discount Amount',
      'Total Amount',
      'Paid Amount',
      'Balance Due',
    ];

    const rows = listToExport.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.issueDate}"`,
      `"${inv.dueDate}"`,
      `"${inv.status.toUpperCase()}"`,
      `"${inv.client.name.replace(/"/g, '""')}"`,
      `"${inv.client.email}"`,
      inv.subtotal,
      inv.taxAmount,
      inv.discountAmount,
      inv.totalAmount,
      inv.paidAmount,
      inv.balanceDue,
    ]);

    const safeFileName = (companyProfile.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcelData = (selectedInvoices?: Invoice[]) => {
    const listToExport = selectedInvoices || invoices;
    if (listToExport.length === 0) return;

    const tableRows = listToExport.map((inv) => `
      <tr>
        <td><b>${inv.invoiceNumber}</b></td>
        <td>${inv.issueDate}</td>
        <td>${inv.dueDate}</td>
        <td>${inv.status.toUpperCase()}</td>
        <td>${inv.client.name}</td>
        <td>${inv.client.company || ''}</td>
        <td>${inv.client.phone}</td>
        <td>${inv.client.email}</td>
        <td>${inv.items.map((i) => `${i.description} (x${i.quantity})`).join(', ')}</td>
        <td>${inv.subtotal}</td>
        <td>${inv.taxAmount}</td>
        <td>${inv.discountAmount}</td>
        <td style="font-weight:bold; color:#ff5400;">${inv.totalAmount}</td>
        <td>${inv.paidAmount}</td>
        <td>${inv.balanceDue}</td>
      </tr>
    `).join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
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
        ratesData,
        exchangeRates,
        isRatesLoading,
        refreshExchangeRates,
        convertAmount,
        formatConverted,
        getRateBetween,
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
        isDbConnected,
        refreshData: fetchFromDatabase,
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
