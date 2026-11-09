import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  BadgeCheck,
  HeartPulse,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});
type LoginForm = z.infer<typeof loginSchema>;

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
type RegistrationForm = z.infer<typeof registrationSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === "/register";
  const prefersReducedMotion = useReducedMotion();
  const setSession = useAuthStore((s) => s.setSession);
  const [mfaSessionToken, setMfaSessionToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const {
    register: registerField,
    handleSubmit: handleRegistrationSubmit,
    formState: { errors: registrationErrors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { roleName: "PHYSICIAN" },
  });

  async function onSubmit(values: LoginForm) {
    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await api.login(values.identifier, values.password);
      if (result.mfaRequired && result.mfaSessionToken) {
        setMfaSessionToken(result.mfaSessionToken);
      } else if (result.accessToken && result.refreshToken) {
        setSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          roles: result.roles ?? [],
          permissions: (result.permissions ?? []) as never,
        });
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Unable to reach the backend. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(values: RegistrationForm) {
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
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Unable to submit your access request. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa() {
    if (!mfaSessionToken) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await api.verifyMfa(mfaSessionToken, mfaCode);
      if (result.accessToken && result.refreshToken) {
        setSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          roles: result.roles ?? [],
          permissions: (result.permissions ?? []) as never,
        });
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "MFA verification failed.");
    } finally {
      setLoading(false);
    }
  }

  const panelMotion = prefersReducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="min-h-screen bg-[#edf3f2] p-3 sm:p-6 lg:grid lg:place-items-center">
      <div className="mx-auto grid min-h-[min(760px,calc(100vh-3rem))] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_90px_-42px_rgba(15,55,59,0.38)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-[#8f1d35] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl border border-white/20 bg-white/10">
              <ShieldCheck size={25} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">Careline</p>
              <p className="text-xs text-rose-100">Clinical workspace</p>
            </div>
          </div>

          <div className="relative z-10 max-w-md py-12">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">Care, coordinated</p>
            <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">Clinical decisions, with the whole picture.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-rose-100">A secure workspace for care teams and clinician-reviewed decision support.</p>
            <div className="mt-10 flex items-center gap-3 border-t border-white/15 pt-5 text-sm text-rose-100">
              <HeartPulse size={19} />
              <span>Patient-centered workflows</span>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs text-rose-200">
            <LockKeyhole size={14} /> Secure access for healthcare teams
          </div>
          <div className="pointer-events-none absolute -right-20 top-24 size-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 top-36 size-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute bottom-28 right-16 grid size-20 place-items-center rounded-2xl border border-white/15 bg-white/5 text-rose-100">
            <Activity size={34} strokeWidth={1.4} />
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-7 sm:px-10 lg:px-12 xl:px-16">
          <motion.div
            {...panelMotion}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <span className="grid size-11 place-items-center rounded-xl bg-rose-800 text-white">
                <ShieldCheck size={23} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Careline</p>
                <p className="text-xs text-slate-500">Clinical workspace</p>
              </div>
            </div>

            {!mfaSessionToken && (
              <div className="mb-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Account access">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isRegister}
                  onClick={() => navigate("/login")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${!isRegister ? "bg-white text-rose-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <LogIn size={16} /> Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isRegister}
                  onClick={() => navigate("/register")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${isRegister ? "bg-white text-rose-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <UserRoundPlus size={16} /> Request access
                </button>
              </div>
            )}

            {mfaSessionToken ? (
              <div>
                <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-800">
                  <ShieldCheck size={23} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">Verify your identity</h2>
                <p className="mt-2 text-sm text-slate-500">Enter your 6-digit authentication code to continue.</p>
                <div className="mt-6 space-y-4">
                  <input
                    id="mfa"
                    aria-label="Authentication code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-lg tracking-widest focus-ring"
                  />
                  {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
                  <button
                    onClick={submitMfa}
                    disabled={loading || mfaCode.length !== 6}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60"
                  >
                    <ShieldCheck size={17} /> {loading ? "Verifying..." : "Verify and continue"}
                  </button>
                </div>
              </div>
            ) : isRegister ? (
              <div>
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                  <Stethoscope size={23} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">Request clinical access</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">Submit your care-team details. An administrator must approve your account before you can sign in.</p>

                {registrationMessage ? (
                  <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5" role="status">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 shrink-0 text-teal-800" size={21} />
                      <div>
                        <p className="text-sm font-semibold text-teal-950">Request received</p>
                        <p className="mt-1 text-sm leading-relaxed text-teal-900">{registrationMessage}</p>
                      </div>
                    </div>
                    <button onClick={() => navigate("/login")} className="mt-5 text-sm font-semibold text-rose-900 hover:underline">
                      Return to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegistrationSubmit(onRegister)} className="mt-6 space-y-3.5" noValidate>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AuthField id="fullName" label="Full name" icon={UserRound} error={registrationErrors.fullName?.message}>
                        <input id="fullName" {...registerField("fullName")} autoComplete="name" className="auth-input" />
                      </AuthField>
                      <AuthField id="username" label="Username" icon={UserRound} error={registrationErrors.username?.message}>
                        <input id="username" {...registerField("username")} autoComplete="username" className="auth-input" />
                      </AuthField>
                    </div>
                    <AuthField id="email" label="Work email" icon={Mail} error={registrationErrors.email?.message}>
                      <input id="email" type="email" {...registerField("email")} autoComplete="email" className="auth-input" />
                    </AuthField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AuthField id="roleName" label="Requested role" icon={Stethoscope} error={registrationErrors.roleName?.message}>
                        <select id="roleName" {...registerField("roleName")} className="auth-input">
                          <option value="PHYSICIAN">Physician</option>
                          <option value="NURSE">Nurse</option>
                        </select>
                      </AuthField>
                      <AuthField id="licenseNumber" label="License number" icon={BadgeCheck} error={registrationErrors.licenseNumber?.message}>
                        <input id="licenseNumber" {...registerField("licenseNumber")} autoComplete="off" className="auth-input" />
                      </AuthField>
                    </div>
                    <AuthField id="registerPassword" label="Password" icon={LockKeyhole} error={registrationErrors.password?.message}>
                      <input id="registerPassword" type="password" {...registerField("password")} autoComplete="new-password" className="auth-input" />
                    </AuthField>
                    <AuthField id="confirmPassword" label="Confirm password" icon={LockKeyhole} error={registrationErrors.confirmPassword?.message}>
                      <input id="confirmPassword" type="password" {...registerField("confirmPassword")} autoComplete="new-password" className="auth-input" />
                    </AuthField>
                    {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60"
                    >
                      <UserRoundPlus size={17} /> {loading ? "Submitting request..." : "Submit access request"}
                    </button>
                    <p className="text-center text-xs leading-relaxed text-slate-500">Passwords need at least 12 characters, including upper and lowercase letters, a number, and a symbol.</p>
                  </form>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-800">
                  <HeartPulse size={23} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
                <p className="mt-2 text-sm text-slate-500">Sign in to your clinical workspace.</p>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                  <AuthField id="identifier" label="Username or email" icon={UserRound} error={loginErrors.identifier?.message}>
                    <input id="identifier" {...register("identifier")} autoComplete="username" className="auth-input" />
                  </AuthField>
                  <AuthField id="password" label="Password" icon={LockKeyhole} error={loginErrors.password?.message}>
                    <input id="password" type="password" {...register("password")} autoComplete="current-password" className="auth-input" />
                  </AuthField>
                  {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60"
                  >
                    <LogIn size={17} /> {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function AuthField({
  id,
  label,
  icon: Icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: typeof UserRound;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
