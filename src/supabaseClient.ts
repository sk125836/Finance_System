import { createClient } from '@supabase/supabase-js';

// =========================================================================
// SUPABASE CONFIGURATION
// =========================================================================
const SUPABASE_URL = "https://wumjimlokatzywjgxpep.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_kEPxojmdSGfpcrFnS3MPDQ_3MnuhTfl";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
