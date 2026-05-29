import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Radio, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AuthForm({ onLoginSuccess }: { onLoginSuccess: (username?: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan kata sandi harus diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Karena Supabase Auth memerlukan format email, kita akan memalsukan email dari username
        // Ini adalah trik umum jika kita hanya ingin autentikasi username tanpa mengubah skema email wajib dari Supabase.
        const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@nextvwt.local`;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password,
        });

        if (signInError) throw signInError;

        const lastUsername = localStorage.getItem("vwt_username");
        if (lastUsername !== username) {
          localStorage.removeItem("vwt_avatar_data_url");
        }
        localStorage.setItem("vwt_username", username);

        onLoginSuccess(username);
      } else {
        const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@nextvwt.local`;

        const { error: signUpError } = await supabase.auth.signUp({
          email: fakeEmail,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        if (signUpError) throw signUpError;

        const lastUsername = localStorage.getItem("vwt_username");
        if (lastUsername !== username) {
          localStorage.removeItem("vwt_avatar_data_url");
        }
        localStorage.setItem("vwt_username", username);

        // Supabase biasanya memerlukan konfirmasi email kecuali dinonaktifkan di dashboard
        // Untuk prototipe ini, kita asumsikan auto-confirm atau kita langsung login
        onLoginSuccess(username);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);

      // OFFLINE FALLBACK MECHANISM (Last-Write-Wins / Offline-ready)
      if (
        err.message === "Failed to fetch" ||
        err.message.includes("NetworkError")
      ) {
        console.warn(
          "[Offline Mode] Tidak dapat terhubung ke Supabase. Menggunakan sesi lokal/mock.",
        );
        // Simpan username ke localStorage untuk mensimulasikan login
        const lastUsername = localStorage.getItem("vwt_username");
        if (lastUsername !== username) {
          localStorage.removeItem("vwt_avatar_data_url");
        }
        localStorage.setItem("vwt_username", username);
        // Paksa aplikasi untuk memuat (Bypass Auth)
        onLoginSuccess(username);
        return;
      }

      setError(err.message || "Terjadi kesalahan saat autentikasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f1729] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700/40 bg-[#1a2540] p-6 shadow-2xl"
      >
        <div className="mb-5 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/20">
            <Radio className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            NextVWT
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Jaringan Komunikasi Terpadu
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border-0 bg-[#0f1729] px-3 py-2.5 text-white placeholder-slate-600 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-amber-500 text-sm transition-all"
              placeholder="Masukkan username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kata Sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-0 bg-[#0f1729] px-3 py-2.5 text-white placeholder-slate-600 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-amber-500 text-sm transition-all"
              placeholder="Masukkan kata sandi"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-amber-400 hover:to-orange-500 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLogin ? (
              "Masuk ke Sistem"
            ) : (
              "Daftar Akun Baru"
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-slate-400">
            {isLogin ? "Belum memiliki akses?" : "Sudah terdaftar?"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="ml-2 font-bold text-amber-500 transition-colors hover:text-amber-400"
            >
              {isLogin ? "Daftar Sekarang" : "Masuk Disini"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
