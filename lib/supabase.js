import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqpaleaybyiadhpfpyh.supabase.co';
// Using the provided Anon Key directly to ensure connectivity in the current environment
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cXBhbGVheWJ5aWFkaHBmcHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTgxNjUsImV4cCI6MjA4NDM3NDE2NX0.Pd5b_kMhmwWZ70u3C5QOhxmBu0iZS4-EznBwvY6hfYg';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);