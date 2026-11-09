import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Pill,
  Plus,
  Server,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

type ServiceHealth = { database: { status: string }; aiService: { status: string } };

const workflows: {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    label: "Patients",
    description: "Find and manage patient records",
    path: "/dashboard/patients",
    icon: Users,
    tone: "bg-rose-50 text-rose-800",
  },
  {
    label: "Encounters",
    description: "Review visits, notes, and observations",
    path: "/dashboard/encounters",
    icon: ClipboardList,
    tone: "bg-teal-50 text-teal-800",
  },
  {
    label: "Diagnosis",
    description: "Record a clinician-reviewed diagnosis",
    path: "/dashboard/diagnosis",
    icon: Stethoscope,
    tone: "bg-amber-50 text-amber-800",
  },
  {
    label: "Prescriptions",
    description: "Review medication orders and safety checks",
    path: "/dashboard/prescriptions",
    icon: Pill,
    tone: "bg-sky-50 text-sky-800",
  },
  {
    label: "Medications",
    description: "Search the medication reference",
    path: "/dashboard/medications",
    icon: Activity,
    tone: "bg-emerald-50 text-emerald-800",
  },
  {
    label: "Clinical reports",
    description: "Compile and review patient summaries",
    path: "/dashboard/reports",
    icon: FileText,
    tone: "bg-orange-50 text-orange-800",
  },
  {
    label: "Audit trail",
    description: "Review access and clinical actions",
    path: "/dashboard/audit",
    icon: ShieldCheck,
    tone: "bg-slate-100 text-slate-700",
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { roles, refreshToken, clearSession } = useAuthStore();
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const roleLabel = roles[0]?.split("_").join(" ").toLowerCase() ?? "care team member";
  const visibleWorkflows = roles.includes("SYSTEM_ADMIN")
    ? [
        ...workflows,
        {
          label: "User management",
          description: "Manage staff accounts and access",
          path: "/dashboard/users",
          icon: Users,
          tone: "bg-indigo-50 text-indigo-800",
        },
      ]
    : workflows;
  const greeting = new Intl.DateTimeFormat("en", { hour: "numeric" }).format(new Date()).includes("AM")
    ? "Good morning"
    : "Good afternoon";

  useEffect(() => {
    api
      .healthDependencies()
      .then(setHealth)
      .catch(() => setHealth({ database: { status: "unavailable" }, aiService: { status: "unavailable" } }));
  }, []);

  async function handleLogout() {
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#f6f8f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-800 text-white">
              <ShieldCheck size={21} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-wide text-slate-900">Careline</p>
              <p className="truncate text-xs text-slate-500">Clinical workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold capitalize">{roleLabel}</p>
              <p className="text-xs text-slate-500">Signed in</p>
            </div>
            <span className="h-8 w-px bg-slate-200" aria-hidden="true" />
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-screen-2xl gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:py-8">
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Workspace</p>
            <nav className="space-y-1" aria-label="Main navigation">
              <div className="flex items-center gap-3 rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-900">
                <LayoutDashboard size={17} /> Overview
              </div>
              <NavItem icon={Users} label="Patients" onClick={() => navigate("/dashboard/patients")} />
              <NavItem icon={ClipboardList} label="Encounters" onClick={() => navigate("/dashboard/encounters")} />
              <NavItem icon={Stethoscope} label="Diagnosis" onClick={() => navigate("/dashboard/diagnosis")} />
              <NavItem icon={Pill} label="Prescriptions" onClick={() => navigate("/dashboard/prescriptions")} />
              <NavItem icon={FileText} label="Reports" onClick={() => navigate("/dashboard/reports")} />
              {roles.includes("SYSTEM_ADMIN") && (
                <NavItem icon={Users} label="User management" onClick={() => navigate("/dashboard/users")} />
              )}
            </nav>

            <div className="mt-8 border-t border-slate-200 pt-5">
              <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">System</p>
              <NavItem icon={Activity} label="Medications" onClick={() => navigate("/dashboard/medications")} />
              <NavItem icon={ShieldCheck} label="Audit trail" onClick={() => navigate("/dashboard/audit")} />
            </div>

            <div className="mt-8 rounded-xl border border-rose-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-rose-800">
                <ShieldCheck size={16} />
                <p className="text-xs font-bold">Clinical safety</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">Decision support complements clinician judgment. Review recommendations before acting.</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: "easeOut" }}
            className="relative overflow-hidden rounded-xl bg-rose-900 px-6 py-7 text-white sm:px-8 sm:py-9"
          >
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-200">Care team workspace</p>
                <h1 className="text-2xl font-semibold sm:text-3xl">{greeting}, {roleLabel}</h1>
                <p className="mt-2 text-sm leading-relaxed text-rose-100">A clear view of your clinical tools and connected services.</p>
              </div>
              <button
                onClick={() => navigate("/dashboard/encounters")}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-rose-900 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-rose-50"
              >
                <Plus size={17} /> Open encounters
              </button>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-12 size-48 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute right-8 top-8 hidden size-24 rounded-full border border-white/10 sm:block" />
          </motion.section>

          <motion.section
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.07, delayChildren: prefersReducedMotion ? 0 : 0.12 } },
            }}
            className="mt-7"
          >
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-800">Live status</p>
                <h2 className="mt-1 text-lg font-semibold">Connected services</h2>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block">Updated when this page opened</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusCard icon={Database} label="Patient database" status={health?.database.status ?? "checking"} reducedMotion={!!prefersReducedMotion} />
              <StatusCard icon={Server} label="Decision support" status={health?.aiService.status ?? "checking"} reducedMotion={!!prefersReducedMotion} />
              <StatusCard icon={Activity} label="Application API" status="up" reducedMotion={!!prefersReducedMotion} />
            </div>
          </motion.section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-800">Clinical operations</p>
                <h2 className="mt-1 text-lg font-semibold">Your workspace</h2>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block">Select a workflow to continue</p>
            </div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.055, delayChildren: prefersReducedMotion ? 0 : 0.2 } },
              }}
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              {visibleWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.label}
                  workflow={workflow}
                  reducedMotion={!!prefersReducedMotion}
                  onClick={() => navigate(workflow.path)}
                />
              ))}
            </motion.div>
          </section>

          <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Careline Clinical Decision Support</p>
            <p>AI-generated suggestions require review by an authorized clinician.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-white hover:text-rose-900"
    >
      <Icon size={17} className="text-slate-400" />
      {label}
    </button>
  );
}

function StatusCard({
  icon: Icon,
  label,
  status,
  reducedMotion,
}: {
  icon: LucideIcon;
  label: string;
  status: string;
  reducedMotion: boolean;
}) {
  const isUp = status === "up" || status === "ok";
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reducedMotion ? 0 : 8 },
        show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.3 } },
      }}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${isUp ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold capitalize text-slate-800">{status}</p>
      </div>
      <motion.span
        aria-label={isUp ? "Available" : "Status pending"}
        className={`size-2 rounded-full ${isUp ? "bg-emerald-500" : "bg-amber-400"}`}
        animate={isUp && !reducedMotion ? { opacity: [1, 0.5, 1] } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function WorkflowCard({
  workflow,
  reducedMotion,
  onClick,
}: {
  workflow: (typeof workflows)[number];
  reducedMotion: boolean;
  onClick: () => void;
}) {
  const Icon = workflow.icon;
  return (
    <motion.button
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
      }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
      onClick={onClick}
      className="group flex min-h-28 w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-rose-200 hover:bg-rose-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${workflow.tone}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{workflow.label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{workflow.description}</span>
      </span>
      <ArrowUpRight size={17} className="shrink-0 text-slate-300 transition-colors group-hover:text-rose-800" />
    </motion.button>
  );
}
