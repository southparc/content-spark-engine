import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nuqihflvuxcnzwhqbzxp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cWloZmx2dXhjbnp3aHFienhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDIyMDAsImV4cCI6MjA3NDExODIwMH0.46TPNEciKwKT81GHkBOiF8REZjg8mvHG7kwjvxnK_BM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
