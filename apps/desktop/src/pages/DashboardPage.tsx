import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Database, LogOut, Server } from "lucide-react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { roles, refreshToken, clearSession } = useAuthStore();
  const [health, setHealth] = useState<{ database: { status: string }; aiService: { status: string } } | null>(null);

  useEffect(() => {
    api
      .healthDependencies()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function handleLogout() {
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Signed in as: {roles.join(", ") || "unknown role"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
        >
          <LogOut size={16} /> Log out
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, staggerChildren: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatusCard icon={<Database size={18} />} label="Database" status={health?.database.status ?? "checking..."} />
        <StatusCard icon={<Server size={18} />} label="AI Service" status={health?.aiService.status ?? "checking..."} />
        <StatusCard icon={<Activity size={18} />} label="API" status="up" />
      </motion.div>

      <div className="mt-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">
        Patient management, encounters, diagnostics, prescriptions, and reporting screens build on this
        authenticated shell — this checkpoint proves the full chain: Electron → React → NestJS → PostgreSQL/AI
        gateway is wired end to end.
      </div>
    </div>
  );
}

function StatusCard({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  const isUp = status === "up" || status === "ok";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-medium capitalize">{status}</p>
      </div>
    </div>
  );
}
