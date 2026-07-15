import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wfhdwfrvxkpzuvrkofte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGR3ZnJ2eGtwenV2cmtvZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTQwNzYsImV4cCI6MjA5NTY5MDA3Nn0.VzVcd_w6WHoJl3gSViGWmmCZ24_ljzeD0cycQJOJOgY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const WHATSAPP_NUMBER = "+919400667313";
export const INSTAGRAM_HANDLE = "_chocolush._";
