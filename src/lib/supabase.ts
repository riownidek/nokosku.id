import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Klien standar untuk akses publik
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Klien khusus admin untuk backend (mampu melewati batasan RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);