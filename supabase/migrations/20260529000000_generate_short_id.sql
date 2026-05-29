-- 1. Buat tabel profiles jika belum ada (opsional, disesuaikan dengan skema Anda)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    short_id TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan RLS (Row Level Security) sebagai praktik terbaik
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Fungsi untuk men-generate 5 karakter unik secara acak (A-Z, 0-9)
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
    is_unique BOOLEAN := false;
BEGIN
    -- Looping hingga menemukan ID unik yang belum ada di tabel profiles
    WHILE NOT is_unique LOOP
        result := '';
        FOR i IN 1..5 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Cek apakah ID sudah ada di tabel public.profiles pada kolom short_id
        PERFORM 1 FROM public.profiles WHERE short_id = result;
        IF NOT FOUND THEN
            is_unique := true;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;

-- 3. Fungsi trigger yang memanggil generate_short_id() sebelum Insert
CREATE OR REPLACE FUNCTION public.set_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Hanya set jika kolom short_id masih kosong
    IF NEW.short_id IS NULL THEN
        NEW.short_id := public.generate_short_id();
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Pasang trigger ke tabel public.profiles
-- Hapus trigger jika sudah pernah dibuat sebelumnya agar tidak bentrok
DROP TRIGGER IF EXISTS trigger_set_short_id ON public.profiles;

CREATE TRIGGER trigger_set_short_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_short_id();
