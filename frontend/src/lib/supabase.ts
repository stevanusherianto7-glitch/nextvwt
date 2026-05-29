import { createClient } from "@supabase/supabase-js";

// Menggunakan VITE_ prefix agar di-expose ke sisi klien oleh Vite
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5NjU4NjMzMCwiZXhwIjoxOTkyNjIyMzMwfQ.mock-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Menyimpan sesi ke localStorage otomatis
    autoRefreshToken: true,
  },
  global: {
    headers: {
      "x-client-info": "nextvwt-enterprise",
    },
  },
});
