import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './src/db/index';
import { invoices, clients, expenses, companyProfiles, users } from './src/db/schema';
import { eq, and } from 'drizzle-orm';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zoolyum-pro-invoice-secret-key-2026';

app.use(express.json({ limit: '10mb' }));

// Helper to extract authenticated user from Bearer Token (Local JWT or Supabase JWT)
const getAuthUser = (req: express.Request) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;

    // 1. Try verify with local JWT_SECRET
    try {
      const verified = jwt.verify(token, JWT_SECRET) as any;
      if (verified && (verified.id || verified.sub)) {
        return {
          id: String(verified.id || verified.sub),
          email: String(verified.email || ''),
          name: String(verified.name || ''),
          role: String(verified.role || 'user'),
        };
      }
    } catch {
      // 2. Decode Supabase JWT payload
      const decoded = jwt.decode(token) as any;
      if (decoded && (decoded.sub || decoded.id)) {
        return {
          id: String(decoded.sub || decoded.id),
          email: String(decoded.email || ''),
          name: String(decoded.user_metadata?.name || decoded.user_metadata?.full_name || decoded.name || decoded.email?.split('@')[0] || 'User'),
          role: String(decoded.role || 'user'),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

// -------------------------------------------------------------
// AUTHENTICATION ROUTES (PostgreSQL based)
// -------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'এই ইমেইল দিয়ে ইতোমধ্যে একাউন্ট খোলা হয়েছে (Email already registered)' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newUser = await db.insert(users)
      .values({
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: 'user',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      })
      .returning();

    const created = newUser[0];
    const token = jwt.sign(
      { id: created.id, email: created.email, name: created.name, role: created.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        avatarUrl: created.avatarUrl,
      },
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account in database' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const foundUsers = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (foundUsers.length === 0) {
      return res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয় (Invalid credentials)' });
    }

    const user = foundUsers[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয় (Invalid credentials)' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const foundUsers = await db.select().from(users).where(eq(users.id, auth.id));
    if (foundUsers.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = foundUsers[0];
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// -------------------------------------------------------------
// POSTGRESQL DATA REST API ROUTES
// -------------------------------------------------------------

// --- INVOICES ---
app.get('/api/invoices', async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth?.id) {
      return res.json([]);
    }
    const list = await db.select().from(invoices).where(eq(invoices.userId, auth.id));
    res.json(list);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to retrieve invoices from database' });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const inv = req.body;
    const auth = getAuthUser(req);
    const userId = auth?.id || inv.userId || null;

    if (!inv.id || !inv.invoiceNumber) {
      return res.status(400).json({ error: 'Invoice id and invoiceNumber are required' });
    }

    const inserted = await db.insert(invoices)
      .values({
        id: inv.id,
        userId: userId,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        status: inv.status || 'pending',
        client: inv.client,
        company: inv.company,
        currency: inv.currency,
        items: inv.items,
        subtotal: String(inv.subtotal || 0),
        taxRate: String(inv.taxRate || 0),
        taxAmount: String(inv.taxAmount || 0),
        discountRate: String(inv.discountRate || 0),
        discountAmount: String(inv.discountAmount || 0),
        shippingFee: String(inv.shippingFee || 0),
        totalAmount: String(inv.totalAmount || 0),
        paidAmount: String(inv.paidAmount || 0),
        balanceDue: String(inv.balanceDue || 0),
        paymentDetails: inv.paymentDetails || {},
        notes: inv.notes || '',
        terms: inv.terms || '',
        templateStyle: inv.templateStyle || 'zoolyum-dark',
        remindersSent: inv.remindersSent || [],
        lastReminderSentAt: inv.lastReminderSentAt || null,
        createdAt: inv.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: invoices.id,
        set: {
          userId: userId,
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          status: inv.status || 'pending',
          client: inv.client,
          company: inv.company,
          currency: inv.currency,
          items: inv.items,
          subtotal: String(inv.subtotal || 0),
          taxRate: String(inv.taxRate || 0),
          taxAmount: String(inv.taxAmount || 0),
          discountRate: String(inv.discountRate || 0),
          discountAmount: String(inv.discountAmount || 0),
          shippingFee: String(inv.shippingFee || 0),
          totalAmount: String(inv.totalAmount || 0),
          paidAmount: String(inv.paidAmount || 0),
          balanceDue: String(inv.balanceDue || 0),
          paymentDetails: inv.paymentDetails || {},
          notes: inv.notes || '',
          terms: inv.terms || '',
          templateStyle: inv.templateStyle || 'zoolyum-dark',
          remindersSent: inv.remindersSent || [],
          lastReminderSentAt: inv.lastReminderSentAt || null,
          updatedAt: new Date().toISOString(),
        }
      })
      .returning();

    res.json(inserted[0]);
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ error: 'Failed to save invoice to PostgreSQL' });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(invoices).where(eq(invoices.id, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// --- CLIENTS ---
app.get('/api/clients', async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth?.id) {
      return res.json([]);
    }
    const list = await db.select().from(clients).where(eq(clients.userId, auth.id));
    res.json(list);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to retrieve clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const cl = req.body;
    const auth = getAuthUser(req);
    const userId = auth?.id || cl.userId || null;

    if (!cl.id || !cl.name) {
      return res.status(400).json({ error: 'Client id and name are required' });
    }

    const saved = await db.insert(clients)
      .values({
        id: cl.id,
        userId: userId,
        name: cl.name,
        company: cl.company || '',
        email: cl.email || '',
        phone: cl.phone || '',
        address: cl.address || '',
        city: cl.city || '',
        country: cl.country || 'Bangladesh',
        taxId: cl.taxId || '',
        totalBilled: String(cl.totalBilled || 0),
        invoicesCount: Number(cl.invoicesCount || 0),
        notes: cl.notes || '',
      })
      .onConflictDoUpdate({
        target: clients.id,
        set: {
          userId: userId,
          name: cl.name,
          company: cl.company || '',
          email: cl.email || '',
          phone: cl.phone || '',
          address: cl.address || '',
          city: cl.city || '',
          country: cl.country || 'Bangladesh',
          taxId: cl.taxId || '',
          totalBilled: String(cl.totalBilled || 0),
          invoicesCount: Number(cl.invoicesCount || 0),
          notes: cl.notes || '',
        }
      })
      .returning();

    res.json(saved[0]);
  } catch (error: any) {
    console.error('Error saving client:', error);
    res.status(500).json({ error: 'Failed to save client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(clients).where(eq(clients.id, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth?.id) {
      return res.json([]);
    }
    const list = await db.select().from(expenses).where(eq(expenses.userId, auth.id));
    res.json(list);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const exp = req.body;
    const auth = getAuthUser(req);
    const userId = auth?.id || exp.userId || null;

    if (!exp.id || !exp.title) {
      return res.status(400).json({ error: 'Expense id and title are required' });
    }

    const saved = await db.insert(expenses)
      .values({
        id: exp.id,
        userId: userId,
        title: exp.title,
        category: exp.category || 'miscellaneous',
        amount: String(exp.amount || 0),
        currency: exp.currency,
        date: exp.date || new Date().toISOString().split('T')[0],
        payeeVendor: exp.payeeVendor || '',
        paymentMethod: exp.paymentMethod || 'bank',
        status: exp.status || 'paid',
        receiptUrl: exp.receiptUrl || '',
        notes: exp.notes || '',
        referenceInvoiceId: exp.referenceInvoiceId || null,
        createdAt: exp.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: expenses.id,
        set: {
          userId: userId,
          title: exp.title,
          category: exp.category || 'miscellaneous',
          amount: String(exp.amount || 0),
          currency: exp.currency,
          date: exp.date,
          payeeVendor: exp.payeeVendor || '',
          paymentMethod: exp.paymentMethod || 'bank',
          status: exp.status || 'paid',
          receiptUrl: exp.receiptUrl || '',
          notes: exp.notes || '',
          referenceInvoiceId: exp.referenceInvoiceId || null,
          updatedAt: new Date().toISOString(),
        }
      })
      .returning();

    res.json(saved[0]);
  } catch (error: any) {
    console.error('Error saving expense:', error);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(expenses).where(eq(expenses.id, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// --- COMPANY PROFILE ---
app.get('/api/company-profile', async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (auth?.id) {
      const profile = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, auth.id));
      if (profile.length > 0) {
        return res.json(profile[0]);
      }
    }
    res.json(null);
  } catch (error: any) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to retrieve company profile' });
  }
});

app.post('/api/company-profile', async (req, res) => {
  try {
    const p = req.body;
    const auth = getAuthUser(req);
    const profileKey = auth?.id ? `user_${auth.id}` : 'default';

    const saved = await db.insert(companyProfiles)
      .values({
        profileKey,
        userId: auth?.id || null,
        name: p.name,
        tagline: p.tagline,
        logoUrl: p.logoUrl,
        brandColor: p.brandColor,
        authorizedSignerName: p.authorizedSignerName,
        authorizedSignerTitle: p.authorizedSignerTitle,
        signatureImageUrl: p.signatureImageUrl,
        email: p.email,
        phone: p.phone,
        address: p.address,
        city: p.city,
        country: p.country,
        taxId: p.taxId,
        website: p.website,
        defaultPaymentDetails: p.defaultPaymentDetails,
        defaultCurrency: p.defaultCurrency,
        defaultNotes: p.defaultNotes,
        defaultTerms: p.defaultTerms,
      })
      .onConflictDoUpdate({
        target: companyProfiles.profileKey,
        set: {
          name: p.name,
          tagline: p.tagline,
          logoUrl: p.logoUrl,
          brandColor: p.brandColor,
          authorizedSignerName: p.authorizedSignerName,
          authorizedSignerTitle: p.authorizedSignerTitle,
          signatureImageUrl: p.signatureImageUrl,
          email: p.email,
          phone: p.phone,
          address: p.address,
          city: p.city,
          country: p.country,
          taxId: p.taxId,
          website: p.website,
          defaultPaymentDetails: p.defaultPaymentDetails,
          defaultCurrency: p.defaultCurrency,
          defaultNotes: p.defaultNotes,
          defaultTerms: p.defaultTerms,
          updatedAt: new Date(),
        }
      })
      .returning();

    res.json(saved[0]);
  } catch (error: any) {
    console.error('Error saving company profile:', error);
    res.status(500).json({ error: 'Failed to save company profile' });
  }
});

// Serve static frontend files from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
