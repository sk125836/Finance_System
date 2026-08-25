import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './src/db/index';
import { invoices, clients, expenses, companyProfiles, users } from './src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'zoolyum-pro-invoice-secret-key-2026';

function getAuthUser(req: any) {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    return decoded;
  } catch {
    return null;
  }
}

function postgreSqlApiPlugin(): Plugin {
  return {
    name: 'postgresql-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = req.url.split('?')[0];
        const method = req.method;

        // AUTH: REGISTER
        if (url === '/api/auth/register' && method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { name, email, password } = JSON.parse(body || '{}');
              if (!name || !email || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Name, email and password are required' }));
              }

              const cleanEmail = email.trim().toLowerCase();
              const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
              if (existing.length > 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'এই ইমেইল দিয়ে ইতোমধ্যে একাউন্ট খোলা হয়েছে (Email already registered)' }));
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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                user: {
                  id: created.id,
                  name: created.name,
                  email: created.email,
                  role: created.role,
                  avatarUrl: created.avatarUrl,
                },
                token,
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // AUTH: LOGIN
        if (url === '/api/auth/login' && method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { email, password } = JSON.parse(body || '{}');
              if (!email || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Email and password are required' }));
              }

              const cleanEmail = email.trim().toLowerCase();
              const foundUsers = await db.select().from(users).where(eq(users.email, cleanEmail));
              if (foundUsers.length === 0) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয় (Invalid credentials)' }));
              }

              const user = foundUsers[0];
              const isMatch = await bcrypt.compare(password, user.passwordHash);
              if (!isMatch) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয় (Invalid credentials)' }));
              }

              const token = jwt.sign(
                { id: user.id, email: user.email, name: user.name, role: user.role },
                JWT_SECRET,
                { expiresIn: '30d' }
              );

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  avatarUrl: user.avatarUrl,
                },
                token,
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // AUTH: ME
        if (url === '/api/auth/me' && method === 'GET') {
          try {
            const auth = getAuthUser(req);
            if (!auth) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Unauthorized' }));
            }

            const foundUsers = await db.select().from(users).where(eq(users.id, auth.id));
            if (foundUsers.length === 0) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'User not found' }));
            }

            const user = foundUsers[0];
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
              },
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        // INVOICES
        if (url === '/api/invoices' && method === 'GET') {
          try {
            const auth = getAuthUser(req);
            let list;
            if (auth?.id) {
              list = await db.select().from(invoices).where(eq(invoices.userId, auth.id));
            } else {
              list = await db.select().from(invoices);
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(list));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        if (url === '/api/invoices' && method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const inv = JSON.parse(body || '{}');
              const auth = getAuthUser(req);
              const userId = auth?.id || inv.userId || null;

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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(inserted[0]));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (url.startsWith('/api/invoices/') && method === 'DELETE') {
          const id = url.replace('/api/invoices/', '');
          try {
            await db.delete(invoices).where(eq(invoices.id, id));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        // CLIENTS
        if (url === '/api/clients' && method === 'GET') {
          try {
            const auth = getAuthUser(req);
            let list;
            if (auth?.id) {
              list = await db.select().from(clients).where(eq(clients.userId, auth.id));
            } else {
              list = await db.select().from(clients);
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(list));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        if (url === '/api/clients' && method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const cl = JSON.parse(body || '{}');
              const auth = getAuthUser(req);
              const userId = auth?.id || cl.userId || null;

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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(saved[0]));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (url.startsWith('/api/clients/') && method === 'DELETE') {
          const id = url.replace('/api/clients/', '');
          try {
            await db.delete(clients).where(eq(clients.id, id));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        // EXPENSES
        if (url === '/api/expenses' && method === 'GET') {
          try {
            const auth = getAuthUser(req);
            let list;
            if (auth?.id) {
              list = await db.select().from(expenses).where(eq(expenses.userId, auth.id));
            } else {
              list = await db.select().from(expenses);
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(list));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        if (url === '/api/expenses' && method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const exp = JSON.parse(body || '{}');
              const auth = getAuthUser(req);
              const userId = auth?.id || exp.userId || null;

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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(saved[0]));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (url.startsWith('/api/expenses/') && method === 'DELETE') {
          const id = url.replace('/api/expenses/', '');
          try {
            await db.delete(expenses).where(eq(expenses.id, id));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        // COMPANY PROFILE
        if (url === '/api/company-profile' && method === 'GET') {
          try {
            const auth = getAuthUser(req);
            let list;
            if (auth?.id) {
              list = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, auth.id));
            }
            if (!list || list.length === 0) {
              list = await db.select().from(companyProfiles).where(eq(companyProfiles.profileKey, 'default'));
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(list.length > 0 ? list[0] : null));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        if (url === '/api/company-profile' && method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const p = JSON.parse(body || '{}');
              const auth = getAuthUser(req);
              const profileKey = auth?.id ? `user_${auth.id}` : 'default';

              const saved = await db.insert(companyProfiles)
                .values({
                  profileKey: profileKey,
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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(saved[0]));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), postgreSqlApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
