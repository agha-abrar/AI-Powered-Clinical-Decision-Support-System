import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowUpRight, ClipboardList, Database, FileText, LayoutDashboard, LogOut, Pill, Plus, Server, ShieldCheck, Stethoscope, Users, } from "lucide-react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";
const workflows = [
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
    const [health, setHealth] = useState(null);
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
        if (refreshToken)
            await api.logout(refreshToken).catch(() => undefined);
        clearSession();
        navigate("/login");
    }
    return (_jsxs("div", { className: "min-h-screen bg-[#f6f8f8] text-slate-900", children: [_jsx("header", { className: "border-b border-slate-200 bg-white", children: _jsxs("div", { className: "mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-4 sm:px-7", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [_jsx("div", { className: "grid size-10 shrink-0 place-items-center rounded-xl bg-rose-800 text-white", children: _jsx(ShieldCheck, { size: 21, strokeWidth: 2.2 }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-bold tracking-wide text-slate-900", children: "Careline" }), _jsx("p", { className: "truncate text-xs text-slate-500", children: "Clinical workspace" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "hidden text-right sm:block", children: [_jsx("p", { className: "text-sm font-semibold capitalize", children: roleLabel }), _jsx("p", { className: "text-xs text-slate-500", children: "Signed in" })] }), _jsx("span", { className: "h-8 w-px bg-slate-200", "aria-hidden": "true" }), _jsx("button", { onClick: handleLogout, "aria-label": "Log out", title: "Log out", className: "inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800", children: _jsx(LogOut, { size: 17 }) })] })] }) }), _jsxs("div", { className: "mx-auto grid max-w-screen-2xl gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:py-8", children: [_jsx("aside", { className: "hidden lg:block", children: _jsxs("div", { className: "sticky top-6", children: [_jsx("p", { className: "mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400", children: "Workspace" }), _jsxs("nav", { className: "space-y-1", "aria-label": "Main navigation", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-900", children: [_jsx(LayoutDashboard, { size: 17 }), " Overview"] }), _jsx(NavItem, { icon: Users, label: "Patients", onClick: () => navigate("/dashboard/patients") }), _jsx(NavItem, { icon: ClipboardList, label: "Encounters", onClick: () => navigate("/dashboard/encounters") }), _jsx(NavItem, { icon: Stethoscope, label: "Diagnosis", onClick: () => navigate("/dashboard/diagnosis") }), _jsx(NavItem, { icon: Pill, label: "Prescriptions", onClick: () => navigate("/dashboard/prescriptions") }), _jsx(NavItem, { icon: FileText, label: "Reports", onClick: () => navigate("/dashboard/reports") }), roles.includes("SYSTEM_ADMIN") && (_jsx(NavItem, { icon: Users, label: "User management", onClick: () => navigate("/dashboard/users") }))] }), _jsxs("div", { className: "mt-8 border-t border-slate-200 pt-5", children: [_jsx("p", { className: "mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400", children: "System" }), _jsx(NavItem, { icon: Activity, label: "Medications", onClick: () => navigate("/dashboard/medications") }), _jsx(NavItem, { icon: ShieldCheck, label: "Audit trail", onClick: () => navigate("/dashboard/audit") })] }), _jsxs("div", { className: "mt-8 rounded-xl border border-rose-100 bg-white p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-rose-800", children: [_jsx(ShieldCheck, { size: 16 }), _jsx("p", { className: "text-xs font-bold", children: "Clinical safety" })] }), _jsx("p", { className: "text-xs leading-relaxed text-slate-500", children: "Decision support complements clinician judgment. Review recommendations before acting." })] })] }) }), _jsxs("main", { className: "min-w-0", children: [_jsxs(motion.section, { initial: prefersReducedMotion ? false : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: prefersReducedMotion ? 0 : 0.45, ease: "easeOut" }, className: "relative overflow-hidden rounded-xl bg-rose-900 px-6 py-7 text-white sm:px-8 sm:py-9", children: [_jsxs("div", { className: "relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { className: "max-w-xl", children: [_jsx("p", { className: "mb-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-200", children: "Care team workspace" }), _jsxs("h1", { className: "text-2xl font-semibold sm:text-3xl", children: [greeting, ", ", roleLabel] }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-rose-100", children: "A clear view of your clinical tools and connected services." })] }), _jsxs("button", { onClick: () => navigate("/dashboard/encounters"), className: "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-rose-900 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-rose-50", children: [_jsx(Plus, { size: 17 }), " Open encounters"] })] }), _jsx("div", { className: "pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-white/10" }), _jsx("div", { className: "pointer-events-none absolute -right-2 -top-12 size-48 rounded-full border border-white/10" }), _jsx("div", { className: "pointer-events-none absolute right-8 top-8 hidden size-24 rounded-full border border-white/10 sm:block" })] }), _jsxs(motion.section, { initial: "hidden", animate: "show", variants: {
                                    hidden: {},
                                    show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.07, delayChildren: prefersReducedMotion ? 0 : 0.12 } },
                                }, className: "mt-7", children: [_jsxs("div", { className: "mb-3 flex items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-bold uppercase tracking-[0.12em] text-rose-800", children: "Live status" }), _jsx("h2", { className: "mt-1 text-lg font-semibold", children: "Connected services" })] }), _jsx("p", { className: "hidden text-xs text-slate-500 sm:block", children: "Updated when this page opened" })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx(StatusCard, { icon: Database, label: "Patient database", status: health?.database.status ?? "checking", reducedMotion: !!prefersReducedMotion }), _jsx(StatusCard, { icon: Server, label: "Decision support", status: health?.aiService.status ?? "checking", reducedMotion: !!prefersReducedMotion }), _jsx(StatusCard, { icon: Activity, label: "Application API", status: "up", reducedMotion: !!prefersReducedMotion })] })] }), _jsxs("section", { className: "mt-8", children: [_jsxs("div", { className: "mb-4 flex items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-bold uppercase tracking-[0.12em] text-rose-800", children: "Clinical operations" }), _jsx("h2", { className: "mt-1 text-lg font-semibold", children: "Your workspace" })] }), _jsx("p", { className: "hidden text-xs text-slate-500 sm:block", children: "Select a workflow to continue" })] }), _jsx(motion.div, { initial: "hidden", animate: "show", variants: {
                                            hidden: {},
                                            show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.055, delayChildren: prefersReducedMotion ? 0 : 0.2 } },
                                        }, className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: visibleWorkflows.map((workflow) => (_jsx(WorkflowCard, { workflow: workflow, reducedMotion: !!prefersReducedMotion, onClick: () => navigate(workflow.path) }, workflow.label))) })] }), _jsxs("footer", { className: "mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("p", { children: "Careline Clinical Decision Support" }), _jsx("p", { children: "AI-generated suggestions require review by an authorized clinician." })] })] })] })] }));
}
function NavItem({ icon: Icon, label, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-white hover:text-rose-900", children: [_jsx(Icon, { size: 17, className: "text-slate-400" }), label] }));
}
function StatusCard({ icon: Icon, label, status, reducedMotion, }) {
    const isUp = status === "up" || status === "ok";
    return (_jsxs(motion.div, { variants: {
            hidden: { opacity: 0, y: reducedMotion ? 0 : 8 },
            show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.3 } },
        }, className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4", children: [_jsx("div", { className: `grid size-10 shrink-0 place-items-center rounded-lg ${isUp ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`, children: _jsx(Icon, { size: 18 }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-xs font-medium text-slate-500", children: label }), _jsx("p", { className: "mt-0.5 text-sm font-semibold capitalize text-slate-800", children: status })] }), _jsx(motion.span, { "aria-label": isUp ? "Available" : "Status pending", className: `size-2 rounded-full ${isUp ? "bg-emerald-500" : "bg-amber-400"}`, animate: isUp && !reducedMotion ? { opacity: [1, 0.5, 1] } : undefined, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } })] }));
}
function WorkflowCard({ workflow, reducedMotion, onClick, }) {
    const Icon = workflow.icon;
    return (_jsxs(motion.button, { variants: {
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
        }, whileHover: reducedMotion ? undefined : { y: -3 }, whileTap: reducedMotion ? undefined : { scale: 0.99 }, onClick: onClick, className: "group flex min-h-28 w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-rose-200 hover:bg-rose-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2", children: [_jsx("span", { className: `grid size-11 shrink-0 place-items-center rounded-xl ${workflow.tone}`, children: _jsx(Icon, { size: 20 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-sm font-semibold text-slate-900", children: workflow.label }), _jsx("span", { className: "mt-1 block text-xs leading-relaxed text-slate-500", children: workflow.description })] }), _jsx(ArrowUpRight, { size: 17, className: "shrink-0 text-slate-300 transition-colors group-hover:text-rose-800" })] }));
}
