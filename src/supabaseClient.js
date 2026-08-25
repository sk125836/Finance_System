import { createClient } from '@supabase/supabase-js';

// =========================================================================
// 1. SUPABASE CONFIGURATION: PASTE YOUR CREDENTIALS BELOW
// =========================================================================

// Paste your Supabase Project URL here (e.g., https://xyzcompany.supabase.co):
const SUPABASE_URL = "https://wumjimlokatzywjgxpep.supabase.co";

// Paste your Supabase Anon / Publishable Public Key here:
const SUPABASE_PUBLIC_KEY = "sb_publishable_kEPxojmdSGfpcrFnS3MPDQ_3MnuhTfl";

// =========================================================================
// 2. EXPORT SUPABASE CLIENT INSTANCE
// =========================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
