import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://juafrepntyksgqiqzyes.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWZyZXBudHlrc2dxaXF6eWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTk2NDEsImV4cCI6MjEwNTE5NTY0MX0.vIAQfpjj2PXkgF5Lw8txa0OrCitxmUxG8IEhWePM3Is';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
