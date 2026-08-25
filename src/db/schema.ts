import { pgTable, text, serial, timestamp, numeric, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user'), // 'admin' | 'user'
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const companyProfiles = pgTable('company_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id'), // associated user
  profileKey: text('profile_key').default('default').unique(),
  name: text('name').notNull().default('Zoolyum Innovations Ltd.'),
  tagline: text('tagline').default('Engineering Scalable Next-Gen Digital Products'),
  logoUrl: text('logo_url'),
  brandColor: text('brand_color').default('#ff5500'),
  authorizedSignerName: text('authorized_signer_name'),
  authorizedSignerTitle: text('authorized_signer_title'),
  signatureImageUrl: text('signature_image_url'),
  email: text('email').notNull().default('billing@zoolyum.com'),
  phone: text('phone').notNull().default('+880 1700 000000'),
  address: text('address').notNull().default('Level 6, Silicon Tower, Gulshan-2'),
  city: text('city').notNull().default('Dhaka - 1212'),
  country: text('country').notNull().default('Bangladesh'),
  taxId: text('tax_id').default('BIN-9920194812'),
  website: text('website').default('https://zoolyum.com'),
  defaultPaymentDetails: jsonb('default_payment_details'),
  defaultCurrency: text('default_currency').default('BDT'),
  defaultNotes: text('default_notes'),
  defaultTerms: text('default_terms'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // per-user isolation
  name: text('name').notNull(),
  company: text('company'),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  country: text('country').default('Bangladesh'),
  taxId: text('tax_id'),
  totalBilled: numeric('total_billed').default('0'),
  invoicesCount: integer('invoices_count').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // per-user isolation
  invoiceNumber: text('invoice_number').notNull().unique(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().default('pending'),
  
  // JSON structures for nested properties
  client: jsonb('client').notNull(),
  company: jsonb('company').notNull(),
  currency: jsonb('currency').notNull(),
  items: jsonb('items').notNull(),
  
  subtotal: numeric('subtotal').notNull().default('0'),
  taxRate: numeric('tax_rate').notNull().default('0'),
  taxAmount: numeric('tax_amount').notNull().default('0'),
  discountRate: numeric('discount_rate').notNull().default('0'),
  discountAmount: numeric('discount_amount').notNull().default('0'),
  shippingFee: numeric('shipping_fee').notNull().default('0'),
  totalAmount: numeric('total_amount').notNull().default('0'),
  paidAmount: numeric('paid_amount').notNull().default('0'),
  balanceDue: numeric('balance_due').notNull().default('0'),
  
  paymentDetails: jsonb('payment_details'),
  notes: text('notes'),
  terms: text('terms'),
  templateStyle: text('template_style').default('zoolyum-dark'),
  remindersSent: jsonb('reminders_sent').default([]),
  lastReminderSentAt: text('last_reminder_sent_at'),
  
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // per-user isolation
  title: text('title').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount').notNull().default('0'),
  currency: jsonb('currency').notNull(),
  date: text('date').notNull(),
  payeeVendor: text('payee_vendor'),
  paymentMethod: text('payment_method').notNull().default('bank'),
  status: text('status').notNull().default('paid'),
  receiptUrl: text('receipt_url'),
  notes: text('notes'),
  referenceInvoiceId: text('reference_invoice_id'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const reminderLogs = pgTable('reminder_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  sentAt: text('sent_at').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientName: text('recipient_name').notNull(),
  subject: text('subject').notNull(),
  type: text('type').notNull(),
  channel: text('channel').notNull().default('email'),
  notes: text('notes'),
});
