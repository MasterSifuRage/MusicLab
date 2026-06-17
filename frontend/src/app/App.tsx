import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { useAuthStore } from "../store/authStore";
import { MusicLabLogo } from "./components/MusicLabLogo";

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="flex items-center gap-2.5">
          <MusicLabLogo size={28} />
          <span className="text-[#888888] text-sm tracking-widest uppercase">Loading MusicLab…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </>
  );
}
