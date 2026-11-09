import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, BadgeCheck, HeartPulse, LockKeyhole, LogIn, Mail, ShieldCheck, Stethoscope, UserRound, UserRoundPlus, } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";
const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const loginSchema = z.object({
    identifier: z.string().min(3, "Enter your username or email"),
    password: z.string().min(1, "Enter your password"),
});
const registrationSchema = z
    .object({
    fullName: z.string().min(2, "Enter your full name").max(100),
    username: z.string().regex(/^[A-Za-z0-9._-]{3,30}$/, "Use 3-30 letters, numbers, dots, dashes, or underscores"),
    email: z.string().email("Enter a valid email address"),
    roleName: z.enum(["PHYSICIAN", "NURSE"]),
    licenseNumber: z.string().max(64).optional(),
    password: z.string().regex(passwordPolicyRegex, "Use 12+ characters with uppercase, lowercase, a number, and a symbol"),
    confirmPassword: z.string(),
})
    .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const isRegister = location.pathname === "/register";
    const prefersReducedMotion = useReducedMotion();
    const setSession = useAuthStore((s) => s.setSession);
    const [mfaSessionToken, setMfaSessionToken] = useState(null);
    const [mfaCode, setMfaCode] = useState("");
    const [errorMessage, setErrorMessage] = useState(null);
    const [registrationMessage, setRegistrationMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors: loginErrors }, } = useForm({ resolver: zodResolver(loginSchema) });
    const { register: registerField, handleSubmit: handleRegistrationSubmit, formState: { errors: registrationErrors }, } = useForm({
        resolver: zodResolver(registrationSchema),
        defaultValues: { roleName: "PHYSICIAN" },
    });
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
    async function onRegister(values) {
        setErrorMessage(null);
        setRegistrationMessage(null);
        setLoading(true);
        try {
            const result = await api.register({
                fullName: values.fullName,
                username: values.username,
                email: values.email,
                roleName: values.roleName,
                licenseNumber: values.licenseNumber || undefined,
                password: values.password,
            });
            setRegistrationMessage(result.message);
        }
        catch (err) {
            setErrorMessage(err instanceof ApiError ? err.message : "Unable to submit your access request. Check your connection.");
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
    const panelMotion = prefersReducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
    return (_jsx("main", { className: "min-h-screen bg-[#edf3f2] p-3 sm:p-6 lg:grid lg:place-items-center", children: _jsxs("div", { className: "mx-auto grid min-h-[min(760px,calc(100vh-3rem))] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_90px_-42px_rgba(15,55,59,0.38)] lg:grid-cols-[0.92fr_1.08fr]", children: [_jsxs("section", { className: "relative hidden overflow-hidden bg-[#8f1d35] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14", children: [_jsxs("div", { className: "relative z-10 flex items-center gap-3", children: [_jsx("span", { className: "grid size-12 place-items-center rounded-xl border border-white/20 bg-white/10", children: _jsx(ShieldCheck, { size: 25 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold tracking-wide", children: "Careline" }), _jsx("p", { className: "text-xs text-rose-100", children: "Clinical workspace" })] })] }), _jsxs("div", { className: "relative z-10 max-w-md py-12", children: [_jsx("p", { className: "mb-4 text-xs font-bold uppercase tracking-[0.18em] text-rose-200", children: "Care, coordinated" }), _jsx("h1", { className: "text-4xl font-semibold leading-tight xl:text-5xl", children: "Clinical decisions, with the whole picture." }), _jsx("p", { className: "mt-5 max-w-sm text-sm leading-6 text-rose-100", children: "A secure workspace for care teams and clinician-reviewed decision support." }), _jsxs("div", { className: "mt-10 flex items-center gap-3 border-t border-white/15 pt-5 text-sm text-rose-100", children: [_jsx(HeartPulse, { size: 19 }), _jsx("span", { children: "Patient-centered workflows" })] })] }), _jsxs("div", { className: "relative z-10 flex items-center gap-2 text-xs text-rose-200", children: [_jsx(LockKeyhole, { size: 14 }), " Secure access for healthcare teams"] }), _jsx("div", { className: "pointer-events-none absolute -right-20 top-24 size-80 rounded-full border border-white/10" }), _jsx("div", { className: "pointer-events-none absolute -right-8 top-36 size-56 rounded-full border border-white/10" }), _jsx("div", { className: "pointer-events-none absolute bottom-28 right-16 grid size-20 place-items-center rounded-2xl border border-white/15 bg-white/5 text-rose-100", children: _jsx(Activity, { size: 34, strokeWidth: 1.4 }) })] }), _jsx("section", { className: "flex items-center justify-center bg-white px-5 py-7 sm:px-10 lg:px-12 xl:px-16", children: _jsxs(motion.div, { ...panelMotion, transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }, className: "w-full max-w-lg", children: [_jsxs("div", { className: "mb-7 flex items-center gap-3 lg:hidden", children: [_jsx("span", { className: "grid size-11 place-items-center rounded-xl bg-rose-800 text-white", children: _jsx(ShieldCheck, { size: 23 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-slate-900", children: "Careline" }), _jsx("p", { className: "text-xs text-slate-500", children: "Clinical workspace" })] })] }), !mfaSessionToken && (_jsxs("div", { className: "mb-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1", role: "tablist", "aria-label": "Account access", children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": !isRegister, onClick: () => navigate("/login"), className: `flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${!isRegister ? "bg-white text-rose-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`, children: [_jsx(LogIn, { size: 16 }), " Sign in"] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": isRegister, onClick: () => navigate("/register"), className: `flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${isRegister ? "bg-white text-rose-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`, children: [_jsx(UserRoundPlus, { size: 16 }), " Request access"] })] })), mfaSessionToken ? (_jsxs("div", { children: [_jsx("div", { className: "mb-6 flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-800", children: _jsx(ShieldCheck, { size: 23 }) }), _jsx("h2", { className: "text-2xl font-semibold text-slate-900", children: "Verify your identity" }), _jsx("p", { className: "mt-2 text-sm text-slate-500", children: "Enter your 6-digit authentication code to continue." }), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsx("input", { id: "mfa", "aria-label": "Authentication code", value: mfaCode, onChange: (e) => setMfaCode(e.target.value), maxLength: 6, inputMode: "numeric", className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-lg tracking-widest focus-ring" }), errorMessage && _jsx("p", { className: "text-sm text-red-700", role: "alert", children: errorMessage }), _jsxs("button", { onClick: submitMfa, disabled: loading || mfaCode.length !== 6, className: "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60", children: [_jsx(ShieldCheck, { size: 17 }), " ", loading ? "Verifying..." : "Verify and continue"] })] })] })) : isRegister ? (_jsxs("div", { children: [_jsx("div", { className: "mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800", children: _jsx(Stethoscope, { size: 23 }) }), _jsx("h2", { className: "text-2xl font-semibold text-slate-900", children: "Request clinical access" }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-slate-500", children: "Submit your care-team details. An administrator must approve your account before you can sign in." }), registrationMessage ? (_jsxs("div", { className: "mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5", role: "status", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx(BadgeCheck, { className: "mt-0.5 shrink-0 text-teal-800", size: 21 }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-teal-950", children: "Request received" }), _jsx("p", { className: "mt-1 text-sm leading-relaxed text-teal-900", children: registrationMessage })] })] }), _jsx("button", { onClick: () => navigate("/login"), className: "mt-5 text-sm font-semibold text-rose-900 hover:underline", children: "Return to sign in" })] })) : (_jsxs("form", { onSubmit: handleRegistrationSubmit(onRegister), className: "mt-6 space-y-3.5", noValidate: true, children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(AuthField, { id: "fullName", label: "Full name", icon: UserRound, error: registrationErrors.fullName?.message, children: _jsx("input", { id: "fullName", ...registerField("fullName"), autoComplete: "name", className: "auth-input" }) }), _jsx(AuthField, { id: "username", label: "Username", icon: UserRound, error: registrationErrors.username?.message, children: _jsx("input", { id: "username", ...registerField("username"), autoComplete: "username", className: "auth-input" }) })] }), _jsx(AuthField, { id: "email", label: "Work email", icon: Mail, error: registrationErrors.email?.message, children: _jsx("input", { id: "email", type: "email", ...registerField("email"), autoComplete: "email", className: "auth-input" }) }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(AuthField, { id: "roleName", label: "Requested role", icon: Stethoscope, error: registrationErrors.roleName?.message, children: _jsxs("select", { id: "roleName", ...registerField("roleName"), className: "auth-input", children: [_jsx("option", { value: "PHYSICIAN", children: "Physician" }), _jsx("option", { value: "NURSE", children: "Nurse" })] }) }), _jsx(AuthField, { id: "licenseNumber", label: "License number", icon: BadgeCheck, error: registrationErrors.licenseNumber?.message, children: _jsx("input", { id: "licenseNumber", ...registerField("licenseNumber"), autoComplete: "off", className: "auth-input" }) })] }), _jsx(AuthField, { id: "registerPassword", label: "Password", icon: LockKeyhole, error: registrationErrors.password?.message, children: _jsx("input", { id: "registerPassword", type: "password", ...registerField("password"), autoComplete: "new-password", className: "auth-input" }) }), _jsx(AuthField, { id: "confirmPassword", label: "Confirm password", icon: LockKeyhole, error: registrationErrors.confirmPassword?.message, children: _jsx("input", { id: "confirmPassword", type: "password", ...registerField("confirmPassword"), autoComplete: "new-password", className: "auth-input" }) }), errorMessage && _jsx("p", { className: "text-sm text-red-700", role: "alert", children: errorMessage }), _jsxs("button", { type: "submit", disabled: loading, className: "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60", children: [_jsx(UserRoundPlus, { size: 17 }), " ", loading ? "Submitting request..." : "Submit access request"] }), _jsx("p", { className: "text-center text-xs leading-relaxed text-slate-500", children: "Passwords need at least 12 characters, including upper and lowercase letters, a number, and a symbol." })] }))] })) : (_jsxs("div", { children: [_jsx("div", { className: "mb-5 flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-800", children: _jsx(HeartPulse, { size: 23 }) }), _jsx("h2", { className: "text-2xl font-semibold text-slate-900", children: "Welcome back" }), _jsx("p", { className: "mt-2 text-sm text-slate-500", children: "Sign in to your clinical workspace." }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "mt-6 space-y-4", noValidate: true, children: [_jsx(AuthField, { id: "identifier", label: "Username or email", icon: UserRound, error: loginErrors.identifier?.message, children: _jsx("input", { id: "identifier", ...register("identifier"), autoComplete: "username", className: "auth-input" }) }), _jsx(AuthField, { id: "password", label: "Password", icon: LockKeyhole, error: loginErrors.password?.message, children: _jsx("input", { id: "password", type: "password", ...register("password"), autoComplete: "current-password", className: "auth-input" }) }), errorMessage && _jsx("p", { className: "text-sm text-red-700", role: "alert", children: errorMessage }), _jsxs("button", { type: "submit", disabled: loading, className: "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60", children: [_jsx(LogIn, { size: 17 }), " ", loading ? "Signing in..." : "Sign in"] })] })] }))] }) })] }) }));
}
function AuthField({ id, label, icon: Icon, error, children, }) {
    return (_jsxs("div", { children: [_jsx("label", { htmlFor: id, className: "mb-1.5 block text-xs font-semibold text-slate-700", children: label }), _jsxs("div", { className: "relative", children: [_jsx(Icon, { size: 16, className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), children] }), error && _jsx("p", { className: "mt-1 text-xs text-red-700", children: error })] }));
}
