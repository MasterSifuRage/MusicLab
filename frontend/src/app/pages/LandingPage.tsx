import { Link } from "react-router";
import { Music, Waves, Radio } from "lucide-react";
import { MusicLabBrand } from "../components/MusicLabLogo";
import { useLocaleStore } from "../../store/localeStore";
import { t } from "../../lib/i18n";

export function LandingPage() {
  const locale = useLocaleStore((s) => s.locale);

  return (
    <div className="min-h-screen bg-[#1e1e1e] font-sans">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[#3e3e42] bg-[#252526]">
        <MusicLabBrand />
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-[#888888] hover:text-[#eeeeee] transition-none text-sm uppercase tracking-wide">
            {t(locale, "landing.login")}
          </Link>
          <Link
            to="/signup"
            className="bg-[#0ea5e9] text-white px-5 py-2 rounded-[2px] hover:bg-[#0284c7] transition-none text-sm uppercase tracking-wide font-medium"
          >
            {t(locale, "landing.signup")}
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-4 mb-10 opacity-60">
            <div className="w-16 h-16 border-2 border-[#e11d48] rounded-2xl flex items-center justify-center rotate-12">
              <Waves className="w-8 h-8 text-[#e11d48]" />
            </div>
            <div className="w-16 h-16 border-2 border-[#0ea5e9] rounded-2xl flex items-center justify-center -rotate-6">
              <Radio className="w-8 h-8 text-[#0ea5e9]" />
            </div>
            <div className="w-16 h-16 border-2 border-[#059669] rounded-2xl flex items-center justify-center rotate-6">
              <Music className="w-8 h-8 text-[#059669]" />
            </div>
          </div>

          <h1 className="text-6xl mb-6 text-[#eeeeee] font-light tracking-tight">
            {t(locale, "landing.heroTitle")}{" "}
            <span className="font-bold text-[#0ea5e9]">{t(locale, "landing.heroHighlight")}</span>
          </h1>

          <p className="text-xl text-[#888888] mb-12 max-w-2xl mx-auto">{t(locale, "landing.heroDesc")}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="bg-[#0ea5e9] text-white px-8 py-3 rounded-[2px] hover:bg-[#0284c7] transition-none text-sm uppercase tracking-wide font-medium"
            >
              {t(locale, "landing.getStarted")}
            </Link>
            <Link
              to="/login"
              className="border border-[#3e3e42] text-[#cccccc] px-8 py-3 rounded-[2px] hover:bg-[#333333] transition-none text-sm uppercase tracking-wide"
            >
              {t(locale, "landing.exploreDemo")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
