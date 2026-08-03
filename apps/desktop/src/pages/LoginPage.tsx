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
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [mfaSessionToken, setMfaSessionToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="text-clinical-blue" size={22} />
          <h1 className="text-lg font-semibold">AI-Powered CDSS</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          Clinical Decision Support &amp; Drug Recommendation — educational prototype
        </p>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 my-4 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            This is an educational prototype. It is not clinically validated and does not replace professional
            medical judgment. All AI output requires review by an authorized healthcare professional. Use only
            synthetic or de-identified data.
          </span>
        </div>

        {!mfaSessionToken ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium mb-1">
                Username or email
              </label>
              <input
                id="identifier"
                {...register("identifier")}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 focus-ring"
                autoComplete="username"
              />
              {errors.identifier && <p className="text-xs text-red-600 mt-1">{errors.identifier.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 focus-ring"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-clinical-blue text-white py-2 font-medium transition-colors duration-150 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <label htmlFor="mfa" className="block text-sm font-medium">
              Enter your 6-digit authentication code
            </label>
            <input
              id="mfa"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              maxLength={6}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 tracking-widest text-center text-lg focus-ring"
            />
            {errorMessage && (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            )}
            <button
              onClick={submitMfa}
              disabled={loading || mfaCode.length !== 6}
              className="w-full rounded-lg bg-clinical-blue text-white py-2 font-medium transition-colors duration-150 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6 text-center">Demo: physician@cdss.local / ChangeMe123!</p>
      </motion.div>
    </div>
  );
}
