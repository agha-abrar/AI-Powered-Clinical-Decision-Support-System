import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(3).max(255), // username or email
  password: z.string().min(1).max(256),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  mfaSessionToken: z.string().min(10),
  code: z.string().regex(/^[0-9]{6}$/, "MFA code must be 6 digits").optional(),
  recoveryCode: z.string().min(6).optional(),
}).refine((v) => !!v.code || !!v.recoveryCode, {
  message: "Either code or recoveryCode is required",
});
export type MfaVerifyDto = z.infer<typeof mfaVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3).max(255),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

/**
 * Password policy: >=12 chars, upper, lower, number, special char.
 * Kept as a shared regex so frontend and backend enforce identical rules.
 */
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export const passwordSchema = z
  .string()
  .regex(
    PASSWORD_POLICY_REGEX,
    "Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character",
  );

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(10),
  newPassword: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
