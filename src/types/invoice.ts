export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
  avatarUrl?: string;
  createdAt?: string;
}

export type ExpenseCategory =
  | 'marketing'
  | 'office'
  | 'software'
  | 'salaries'
  | 'utilities'
  | 'travel'
  | 'food'
  | 'hardware'
  | 'taxes'
  | 'miscellaneous';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: {
    symbol: string;
    code: string;
    name: string;
  };
  date: string; // YYYY-MM-DD
  payeeVendor?: string; // Merchant / vendor / person paid
  paymentMethod: 'bank' | 'bkash' | 'nagad' | 'rocket' | 'cash' | 'card' | 'cheque';
  status: 'paid' | 'pending';
  receiptUrl?: string; // Image or base64
  notes?: string;
  referenceInvoiceId?: string; // Optional linked invoice / client
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilterOptions {
  searchQuery: string;
  category: ExpenseCategory | 'all';
  paymentMethod: string | 'all';
  status: 'all' | 'paid' | 'pending';
  dateRange: 'all' | 'today' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'custom';
  startDate?: string;
  endDate?: string;
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'title-asc';
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // e.g. 5 for 5%
  discount?: number; // e.g. 10%
  amount: number;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';

export interface PaymentDetails {
  method: 'bank' | 'bkash' | 'nagad' | 'rocket' | 'cash' | 'card' | 'cheque';
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  routingNumber?: string;
  mobileWalletNumber?: string; // For bKash / Nagad
  paymentNote?: string;
}

export interface ClientVendor {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  country?: string;
  taxId?: string; // BIN or Tax ID
  totalBilled?: number;
  invoicesCount?: number;
  notes?: string;
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  logoUrl?: string;
  brandColor?: string; // Dominant dynamic brand hex color extracted from logo
  brandColorPalette?: any;
  authorizedSignerName?: string;
  authorizedSignerTitle?: string;
  signatureImageUrl?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string; // BIN/VAT No
  website: string;
  defaultPaymentDetails: PaymentDetails;
  defaultCurrency: string;
  defaultNotes: string;
  defaultTerms: string;
}

export interface ReminderLog {
  id: string;
  sentAt: string; // ISO date string
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type: 'approaching' | 'due_today' | 'overdue_1' | 'overdue_2' | 'final_notice' | 'paid_receipt' | 'custom';
  channel: 'email' | 'whatsapp' | 'system';
  notes?: string;
}

export interface AutomationSettings {
  autoCheckEnabled: boolean;
  alertBeforeDays: number; // e.g. 3 days before
  alertOnDueDate: boolean;
  alertAfterDays: number[]; // e.g. [3, 7, 14]
  senderName: string;
  senderEmail: string;
  defaultEmailSubject: string;
  ccEmail?: string;
  enableWhatsAppQuickLinks: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  status: InvoiceStatus;
  
  // Vendor / Client Information
  client: {
    id?: string;
    name: string;
    company?: string;
    email: string;
    phone: string;
    address: string;
    taxId?: string;
  };

  // Issuer Information (Zoolyum)
  company: CompanyProfile;

  // Currency
  currency: {
    symbol: string;
    code: string;
    name: string;
  };

  // Line Items
  items: InvoiceItem[];

  // Calculation details
  subtotal: number;
  taxRate: number;        // overall VAT / Tax percentage e.g. 5%
  taxAmount: number;
  discountRate: number;   // overall discount %
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;

  // Additional details
  paymentDetails: PaymentDetails;
  notes: string;
  terms: string;
  templateStyle?: 'zoolyum-dark' | 'modern-orange' | 'minimal-clean' | 'classic-corporate';
  remindersSent?: ReminderLog[];
  lastReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  searchQuery: string;
  status: InvoiceStatus | 'all';
  vendorId: string | 'all';
  dateRange: 'all' | 'today' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'custom';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'vendor-asc' | 'number-desc';
}
