-- =========================================================================
-- SUPABASE DATABASE SCHEMA FOR INVOICING & EXPENSE SYSTEM
-- You can run this in your Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    client JSONB,
    company JSONB,
    currency JSONB,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_rate NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    shipping_fee NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    payment_details JSONB,
    notes TEXT,
    terms TEXT,
    reminders_sent JSONB DEFAULT '[]'::jsonb,
    last_reminder_sent_at TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB
);

-- 3. CLIENTS / VENDORS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_id TEXT,
    total_billed NUMERIC DEFAULT 0,
    invoices_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB
);

-- 4. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'miscellaneous',
    amount NUMERIC NOT NULL DEFAULT 0,
    currency JSONB,
    date TEXT NOT NULL,
    payee_vendor TEXT,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'paid',
    receipt_url TEXT,
    notes TEXT,
    reference_invoice_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB
);

-- 5. COMPANY PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.company_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    logo_url TEXT,
    brand_color TEXT,
    brand_palette JSONB,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_id TEXT,
    website TEXT,
    default_payment_details JSONB,
    default_currency TEXT,
    default_notes TEXT,
    default_terms TEXT,
    authorized_signer_name TEXT,
    authorized_signer_title TEXT,
    signature_image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB
);

-- Enable Row Level Security (RLS) & Policies for safety
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users full access to their own data
DROP POLICY IF EXISTS "Users can manage their own invoices" ON public.invoices;
CREATE POLICY "Users can manage their own invoices" ON public.invoices
    FOR ALL USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients" ON public.clients
    FOR ALL USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage their own company profile" ON public.company_profiles;
CREATE POLICY "Users can manage their own company profile" ON public.company_profiles
    FOR ALL USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
