import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { MusicLabBrand } from "../components/MusicLabLogo";
import { toast } from "sonner";
import { useAuthStore } from "../../store/authStore";

export function SignUpPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !username.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setLoading(true);
    try {
      const user = await signup(email, username, password);
      toast.success(`Account created. Welcome, ${user.username}!`);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed.");
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

          <h2 className="text-xl text-[#eeeeee] text-center mb-6 uppercase tracking-wide">Join MusicLab</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-[#888888] mb-1.5 uppercase tracking-wide text-[10px]">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-4 py-2.5 text-[#cccccc] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                placeholder="producer@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-[#888888] mb-1.5 uppercase tracking-wide text-[10px]">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-4 py-2.5 text-[#cccccc] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                placeholder="producer_99"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[#888888] mb-1.5 uppercase tracking-wide text-[10px]">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-4 py-2.5 text-[#cccccc] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[12px] text-[#e11d48]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0ea5e9] font-medium text-white py-3 rounded-lg hover:bg-[#0284c7] transition-colors uppercase tracking-wide mt-4 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-[#888888] mt-6 text-[12px]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#0ea5e9] hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
