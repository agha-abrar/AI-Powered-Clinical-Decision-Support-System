import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";
const loginSchema = z.object({
    identifier: z.string().min(3, "Enter your username or email"),
    password: z.string().min(1, "Enter your password"),
});
export default function LoginPage() {
    const navigate = useNavigate();
    const setSession = useAuthStore((s) => s.setSession);
    const [mfaSessionToken, setMfaSessionToken] = useState(null);
    const [mfaCode, setMfaCode] = useState("");
    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors }, } = useForm({ resolver: zodResolver(loginSchema) });
    async function onSubmit(values) {
        setErrorMessage(null);
        setLoading(true);
        try {
            const result = await api.login(values.identifier, values.password);
            if (result.mfaRequired && result.mfaSessionToken) {
                setMfaSessionToken(result.mfaSessionToken);
            }
            else if (result.accessToken && result.refreshToken) {
                setSession({
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    roles: result.roles ?? [],
                    permissions: (result.permissions ?? []),
                });
                navigate("/dashboard");
            }
        }
        catch (err) {
            setErrorMessage(err instanceof ApiError ? err.message : "Unable to reach the backend. Check your connection.");
        }
        finally {
            setLoading(false);
        }
    }
    async function submitMfa() {
        if (!mfaSessionToken)
            return;
        setErrorMessage(null);
        setLoading(true);
        try {
            const result = await api.verifyMfa(mfaSessionToken, mfaCode);
            if (result.accessToken && result.refreshToken) {
                setSession({
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    roles: result.roles ?? [],
                    permissions: (result.permissions ?? []),
                });
                navigate("/dashboard");
            }
        }
        catch (err) {
            setErrorMessage(err instanceof ApiError ? err.message : "MFA verification failed.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-4", children: _jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 }, className: "w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(ShieldCheck, { className: "text-clinical-blue", size: 22 }), _jsx("h1", { className: "text-lg font-semibold", children: "AI-Powered CDSS" })] }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mb-1", children: "Clinical Decision Support & Drug Recommendation \u2014 educational prototype" }), _jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 my-4 text-xs text-amber-800 dark:text-amber-300", children: [_jsx(AlertTriangle, { size: 16, className: "mt-0.5 shrink-0" }), _jsx("span", { children: "This is an educational prototype. It is not clinically validated and does not replace professional medical judgment. All AI output requires review by an authorized healthcare professional. Use only synthetic or de-identified data." })] }), !mfaSessionToken ? (_jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", noValidate: true, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "identifier", className: "block text-sm font-medium mb-1", children: "Username or email" }), _jsx("input", { id: "identifier", ...register("identifier"), className: "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 focus-ring", autoComplete: "username" }), errors.identifier && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.identifier.message })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium mb-1", children: "Password" }), _jsx("input", { id: "password", type: "password", ...register("password"), className: "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 focus-ring", autoComplete: "current-password" }), errors.password && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.password.message })] }), errorMessage && (_jsx("p", { className: "text-sm text-red-600", role: "alert", children: errorMessage })), _jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-lg bg-clinical-blue text-white py-2 font-medium transition-colors duration-150 hover:bg-blue-700 disabled:opacity-60", children: loading ? "Signing in..." : "Log in" })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx("label", { htmlFor: "mfa", className: "block text-sm font-medium", children: "Enter your 6-digit authentication code" }), _jsx("input", { id: "mfa", value: mfaCode, onChange: (e) => setMfaCode(e.target.value), maxLength: 6, className: "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 tracking-widest text-center text-lg focus-ring" }), errorMessage && (_jsx("p", { className: "text-sm text-red-600", role: "alert", children: errorMessage })), _jsx("button", { onClick: submitMfa, disabled: loading || mfaCode.length !== 6, className: "w-full rounded-lg bg-clinical-blue text-white py-2 font-medium transition-colors duration-150 hover:bg-blue-700 disabled:opacity-60", children: loading ? "Verifying..." : "Verify" })] })), _jsx("p", { className: "text-xs text-slate-400 mt-6 text-center", children: "Demo: physician@cdss.local / ChangeMe123!" })] }) }));
}
