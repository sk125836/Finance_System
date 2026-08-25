import { supabase } from '../supabaseClient';
import { Invoice, ClientVendor, Expense, CompanyProfile } from '../types/invoice';

/**
 * Supabase Database Synchronization Service
 * Direct sync for Invoices, Clients, Expenses, and Company Profiles
 */

// ==========================================
// 1. INVOICE OPERATIONS
// ==========================================
export const syncInvoiceToSupabase = async (invoice: Invoice, userId?: string | null) => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const payload = {
      id: invoice.id,
      user_id: activeUserId,
      invoice_number: invoice.invoiceNumber,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      status: invoice.status,
      client: invoice.client,
      company: invoice.company,
      currency: invoice.currency,
      items: invoice.items,
      subtotal: Number(invoice.subtotal) || 0,
      tax_rate: Number(invoice.taxRate) || 0,
      tax_amount: Number(invoice.taxAmount) || 0,
      discount_rate: Number(invoice.discountRate) || 0,
      discount_amount: Number(invoice.discountAmount) || 0,
      shipping_fee: Number(invoice.shippingFee) || 0,
      total_amount: Number(invoice.totalAmount) || 0,
      paid_amount: Number(invoice.paidAmount) || 0,
      balance_due: Number(invoice.balanceDue) || 0,
      payment_details: invoice.paymentDetails,
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      reminders_sent: invoice.remindersSent || [],
      last_reminder_sent_at: invoice.lastReminderSentAt || null,
      created_at: invoice.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: invoice, // Complete JSON backup for flexible schema
    };

    const { data, error } = await supabase
      .from('invoices')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Supabase Invoice Upsert Notice:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('Supabase Invoice Sync Error:', err);
    return null;
  }
};

export const fetchInvoicesFromSupabase = async (userId?: string | null): Promise<Invoice[] | null> => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase Invoice Fetch Notice:', error.message);
      return null;
    }

    if (data && Array.isArray(data)) {
      return data.map((row: any): Invoice => {
        // If stored as structured json inside 'data' or columns
        if (row.data && row.data.invoiceNumber) {
          return {
            ...row.data,
            id: row.id || row.data.id,
            status: row.status || row.data.status,
            totalAmount: Number(row.total_amount ?? row.data.totalAmount) || 0,
            paidAmount: Number(row.paid_amount ?? row.data.paidAmount) || 0,
            balanceDue: Number(row.balance_due ?? row.data.balanceDue) || 0,
          };
        }

        return {
          id: row.id,
          invoiceNumber: row.invoice_number || row.invoiceNumber || 'INV-001',
          issueDate: row.issue_date || row.issueDate || new Date().toISOString().split('T')[0],
          dueDate: row.due_date || row.dueDate || new Date().toISOString().split('T')[0],
          status: row.status || 'draft',
          client: row.client || { name: 'Client', email: '', phone: '', address: '' },
          company: row.company || {},
          currency: row.currency || { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka' },
          items: Array.isArray(row.items) ? row.items : [],
          subtotal: Number(row.subtotal) || 0,
          taxRate: Number(row.tax_rate ?? row.taxRate) || 0,
          taxAmount: Number(row.tax_amount ?? row.taxAmount) || 0,
          discountRate: Number(row.discount_rate ?? row.discountRate) || 0,
          discountAmount: Number(row.discount_amount ?? row.discountAmount) || 0,
          shippingFee: Number(row.shipping_fee ?? row.shippingFee) || 0,
          totalAmount: Number(row.total_amount ?? row.totalAmount) || 0,
          paidAmount: Number(row.paid_amount ?? row.paidAmount) || 0,
          balanceDue: Number(row.balance_due ?? row.balanceDue) || 0,
          paymentDetails: row.payment_details || row.paymentDetails || { method: 'bkash' },
          notes: row.notes || '',
          terms: row.terms || '',
          remindersSent: row.reminders_sent || row.remindersSent || [],
          lastReminderSentAt: row.last_reminder_sent_at || row.lastReminderSentAt,
          createdAt: row.created_at || row.createdAt,
          updatedAt: row.updated_at || row.updatedAt,
        };
      });
    }
    return null;
  } catch (err) {
    console.warn('Supabase Invoice Fetch Error:', err);
    return null;
  }
};

export const deleteInvoiceFromSupabase = async (invoiceId: string) => {
  try {
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) {
      console.warn('Supabase Invoice Delete Notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase Invoice Delete Error:', err);
  }
};

// ==========================================
// 2. CLIENT / VENDOR OPERATIONS
// ==========================================
export const syncClientToSupabase = async (client: ClientVendor, userId?: string | null) => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const payload = {
      id: client.id,
      user_id: activeUserId,
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || '',
      tax_id: client.taxId || '',
      total_billed: Number(client.totalBilled) || 0,
      invoices_count: Number(client.invoicesCount) || 0,
      notes: client.notes || '',
      data: client,
    };

    const { data, error } = await supabase
      .from('clients')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Supabase Client Upsert Notice:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('Supabase Client Sync Error:', err);
    return null;
  }
};

export const fetchClientsFromSupabase = async (userId?: string | null): Promise<ClientVendor[] | null> => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', activeUserId);

    if (error) {
      console.warn('Supabase Client Fetch Notice:', error.message);
      return null;
    }

    if (data && Array.isArray(data)) {
      return data.map((row: any): ClientVendor => {
        if (row.data && row.data.name) {
          return {
            ...row.data,
            id: row.id || row.data.id,
            totalBilled: Number(row.total_billed ?? row.data.totalBilled) || 0,
            invoicesCount: Number(row.invoices_count ?? row.data.invoicesCount) || 0,
          };
        }
        return {
          id: row.id,
          name: row.name || 'Unnamed Client',
          company: row.company || '',
          email: row.email || '',
          phone: row.phone || '',
          address: row.address || '',
          city: row.city || '',
          country: row.country || '',
          taxId: row.tax_id || row.taxId || '',
          totalBilled: Number(row.total_billed ?? row.totalBilled) || 0,
          invoicesCount: Number(row.invoices_count ?? row.invoicesCount) || 0,
          notes: row.notes || '',
        };
      });
    }
    return null;
  } catch (err) {
    console.warn('Supabase Client Fetch Error:', err);
    return null;
  }
};

export const deleteClientFromSupabase = async (clientId: string) => {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) {
      console.warn('Supabase Client Delete Notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase Client Delete Error:', err);
  }
};

// ==========================================
// 3. EXPENSE OPERATIONS
// ==========================================
export const syncExpenseToSupabase = async (expense: Expense, userId?: string | null) => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const payload = {
      id: expense.id,
      user_id: activeUserId,
      title: expense.title,
      category: expense.category,
      amount: Number(expense.amount) || 0,
      currency: expense.currency,
      date: expense.date,
      payee_vendor: expense.payeeVendor || '',
      payment_method: expense.paymentMethod,
      status: expense.status,
      receipt_url: expense.receiptUrl || '',
      notes: expense.notes || '',
      reference_invoice_id: expense.referenceInvoiceId || null,
      created_at: expense.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: expense,
    };

    const { data, error } = await supabase
      .from('expenses')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Supabase Expense Upsert Notice:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('Supabase Expense Sync Error:', err);
    return null;
  }
};

export const fetchExpensesFromSupabase = async (userId?: string | null): Promise<Expense[] | null> => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', activeUserId)
      .order('date', { ascending: false });

    if (error) {
      console.warn('Supabase Expense Fetch Notice:', error.message);
      return null;
    }

    if (data && Array.isArray(data)) {
      return data.map((row: any): Expense => {
        if (row.data && row.data.title) {
          return {
            ...row.data,
            id: row.id || row.data.id,
            amount: Number(row.amount ?? row.data.amount) || 0,
          };
        }
        return {
          id: row.id,
          title: row.title || 'Expense',
          category: row.category || 'miscellaneous',
          amount: Number(row.amount) || 0,
          currency: row.currency || { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka' },
          date: row.date || new Date().toISOString().split('T')[0],
          payeeVendor: row.payee_vendor || row.payeeVendor || '',
          paymentMethod: row.payment_method || row.paymentMethod || 'cash',
          status: row.status || 'paid',
          receiptUrl: row.receipt_url || row.receiptUrl || '',
          notes: row.notes || '',
          referenceInvoiceId: row.reference_invoice_id || row.referenceInvoiceId,
          createdAt: row.created_at || row.createdAt,
          updatedAt: row.updated_at || row.updatedAt,
        };
      });
    }
    return null;
  } catch (err) {
    console.warn('Supabase Expense Fetch Error:', err);
    return null;
  }
};

export const deleteExpenseFromSupabase = async (expenseId: string) => {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) {
      console.warn('Supabase Expense Delete Notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase Expense Delete Error:', err);
  }
};

// ==========================================
// 4. COMPANY PROFILE OPERATIONS
// ==========================================
export const syncCompanyProfileToSupabase = async (profile: CompanyProfile, userId?: string | null) => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const payload = {
      id: `profile_${activeUserId}`,
      user_id: activeUserId,
      name: profile.name,
      tagline: profile.tagline || '',
      logo_url: profile.logoUrl || '',
      brand_color: profile.brandColor || '#ea580c',
      brand_palette: profile.brandColorPalette || {},
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      city: profile.city || '',
      country: profile.country || '',
      tax_id: profile.taxId || '',
      website: profile.website || '',
      default_payment_details: profile.defaultPaymentDetails || {},
      default_currency: profile.defaultCurrency || 'BDT',
      default_notes: profile.defaultNotes || '',
      default_terms: profile.defaultTerms || '',
      authorized_signer_name: profile.authorizedSignerName || '',
      authorized_signer_title: profile.authorizedSignerTitle || '',
      signature_image_url: profile.signatureImageUrl || '',
      data: profile,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('company_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select();

    if (error) {
      console.warn('Supabase Company Profile Upsert Notice:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('Supabase Company Profile Sync Error:', err);
    return null;
  }
};

export const fetchCompanyProfileFromSupabase = async (userId?: string | null): Promise<CompanyProfile | null> => {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', activeUserId)
      .limit(1);

    if (error) {
      console.warn('Supabase Company Profile Fetch Notice:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      const row = data[0];
      if (row.data && row.data.name) {
        return row.data;
      }
      return {
        name: row.name || 'Your Company',
        tagline: row.tagline || '',
        logoUrl: row.logo_url || row.logoUrl,
        brandColor: row.brand_color || row.brandColor || '#ea580c',
        brandColorPalette: row.brand_palette || row.brandColorPalette,
        email: row.email || '',
        phone: row.phone || '',
        address: row.address || '',
        city: row.city || '',
        country: row.country || '',
        taxId: row.tax_id || row.taxId || '',
        website: row.website || '',
        defaultPaymentDetails: row.default_payment_details || row.defaultPaymentDetails || { method: 'bkash' },
        defaultCurrency: row.default_currency || row.defaultCurrency || 'BDT',
        defaultNotes: row.default_notes || row.defaultNotes || '',
        defaultTerms: row.default_terms || row.defaultTerms || '',
        authorizedSignerName: row.authorized_signer_name || row.authorizedSignerName,
        authorizedSignerTitle: row.authorized_signer_title || row.authorizedSignerTitle,
        signatureImageUrl: row.signature_image_url || row.signatureImageUrl,
      };
    }
    return null;
  } catch (err) {
    console.warn('Supabase Company Profile Fetch Error:', err);
    return null;
  }
};
