import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Music, Shield, Loader2 } from "lucide-react";
import { MusicLabBrand } from "../components/MusicLabLogo";
import { toast } from "sonner";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { t } from "../../lib/i18n";

export function LogInPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginAs = useAuthStore((s) => s.loginAs);
  const locale = useLocaleStore((s) => s.locale);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError(t(locale, "auth.errorIdentifier"));
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier, password);
      toast.success(`Welcome back, ${user.username}!`);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: "creator" | "admin") => {
    setLoading(true);
    try {
      const user = await loginAs(role);
      toast.success(`Signed in as demo ${role}.`);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#252526] border border-[#3e3e42] rounded-2xl p-8 shadow-2xl text-[13px]">
          <Link to="/" className="flex items-center justify-center mb-8">
            <MusicLabBrand />
          </Link>

          <h2 className="text-xl text-[#eeeeee] text-center mb-6 uppercase tracking-wide">{t(locale, "auth.welcome")}</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="emailOrUsername" className="block text-[#888888] mb-1.5 uppercase tracking-wide text-[10px]">
                {t(locale, "auth.emailOrUsername")}
              </label>
              <input
                type="text"
                id="emailOrUsername"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-4 py-2.5 text-[#cccccc] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                placeholder="creator@musiclab.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[#888888] mb-1.5 uppercase tracking-wide text-[10px]">
                {t(locale, "auth.password")}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-4 py-2.5 text-[#cccccc] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[12px] text-[#e11d48]">{error}</p>}

            <div className="flex justify-end">
              <Link to="#" className="text-[11px] text-[#0ea5e9] hover:underline">
                {t(locale, "auth.forgotPassword")}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0ea5e9] font-medium text-white py-3 rounded-lg hover:bg-[#0284c7] transition-colors uppercase tracking-wide mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t(locale, "auth.login")}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#3e3e42]">
            <p className="text-center text-[10px] text-[#888888] mb-4 uppercase tracking-widest">{t(locale, "auth.demoAccounts")}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDemo("creator")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1e1e1e] border border-[#3e3e42] text-[#cccccc] py-2.5 rounded-lg hover:bg-[#333333] transition-colors text-sm disabled:opacity-60"
              >
                <Music className="w-4 h-4 text-[#0ea5e9]" />
                {t(locale, "auth.loginCreator")}
              </button>
              <button
                onClick={() => handleDemo("admin")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1e1e1e] border border-[#3e3e42] text-[#cccccc] py-2.5 rounded-lg hover:bg-[#333333] transition-colors text-sm disabled:opacity-60"
              >
                <Shield className="w-4 h-4 text-[#e11d48]" />
                {t(locale, "auth.loginAdmin")}
              </button>
            </div>
          </div>

          <p className="text-center text-[#888888] mt-6 text-[12px]">
            {t(locale, "auth.noAccount")}{" "}
            <Link to="/signup" className="text-[#0ea5e9] hover:underline">
              {t(locale, "auth.signup")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
