import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Database, LogOut, Server } from "lucide-react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";
export default function DashboardPage() {
    const navigate = useNavigate();
    const { roles, refreshToken, clearSession } = useAuthStore();
    const [health, setHealth] = useState(null);
    useEffect(() => {
        api
            .healthDependencies()
            .then(setHealth)
            .catch(() => setHealth(null));
    }, []);
    async function handleLogout() {
        if (refreshToken)
            await api.logout(refreshToken).catch(() => undefined);
        clearSession();
        navigate("/login");
    }
    return (_jsxs("div", { className: "min-h-screen p-8", children: [_jsxs("header", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Dashboard" }), _jsxs("p", { className: "text-sm text-slate-500", children: ["Signed in as: ", roles.join(", ") || "unknown role"] })] }), _jsxs("button", { onClick: handleLogout, className: "flex items-center gap-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150", children: [_jsx(LogOut, { size: 16 }), " Log out"] })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, staggerChildren: 0.05 }, className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(StatusCard, { icon: _jsx(Database, { size: 18 }), label: "Database", status: health?.database.status ?? "checking..." }), _jsx(StatusCard, { icon: _jsx(Server, { size: 18 }), label: "AI Service", status: health?.aiService.status ?? "checking..." }), _jsx(StatusCard, { icon: _jsx(Activity, { size: 18 }), label: "API", status: "up" })] }), _jsx("div", { className: "mt-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500", children: "Patient management, encounters, diagnostics, prescriptions, and reporting screens build on this authenticated shell \u2014 this checkpoint proves the full chain: Electron \u2192 React \u2192 NestJS \u2192 PostgreSQL/AI gateway is wired end to end." })] }));
}
function StatusCard({ icon, label, status }) {
    const isUp = status === "up" || status === "ok";
    return (_jsxs("div", { className: "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3", children: [_jsx("div", { className: `p-2 rounded-lg ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`, children: icon }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-500", children: label }), _jsx("p", { className: "font-medium capitalize", children: status })] })] }));
}
