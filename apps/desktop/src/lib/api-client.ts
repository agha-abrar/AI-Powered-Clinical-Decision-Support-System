import { useAuthStore } from "../stores/auth-store";

const BASE_URL = window.cdssBridge?.apiBaseUrl ?? "http://localhost:3000";

export class ApiError extends Error {
  code: string;
  requestId: string;
  status: number;
  constructor(status: number, code: string, message: string, requestId: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: "Request failed", requestId: "unknown" } }));
    throw new ApiError(res.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? "Request failed", body.error?.requestId ?? "unknown");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface LoginResponse {
  mfaRequired: boolean;
  mfaSessionToken?: string;
  accessToken?: string;
  refreshToken?: string;
  roles?: string[];
  permissions?: string[];
}

export const api = {
  login: (identifier: string, password: string) =>
    request<LoginResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }, false),

  verifyMfa: (mfaSessionToken: string, code: string) =>
    request<LoginResponse>(
      "/api/v1/auth/mfa/verify",
      { method: "POST", body: JSON.stringify({ mfaSessionToken, code }) },
      false,
    ),

  logout: (refreshToken: string) => request("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  healthDependencies: () => request<{ database: { status: string }; aiService: { status: string } }>("/api/v1/health/dependencies", {}, false),

  searchPatients: (query: string) => request(`/api/v1/patients?q=${encodeURIComponent(query)}`),
  createPatient: (body: any) => request(`/api/v1/patients`, { method: "POST", body: JSON.stringify(body) }),
  createEncounter: (patientId: string, body: any) => request(`/api/v1/patients/${patientId}/encounters`, { method: "POST", body: JSON.stringify(body) }),
  deletePatient: (id: string) => request(`/api/v1/patients/${id}`, { method: "DELETE" }),
  getPatient: (id: string) => request(`/api/v1/patients/${id}`),
  updatePatient: (id: string, body: any) => request(`/api/v1/patients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  compileReport: (patientId: string, reportType: string, encounterId?: string) =>
    request(`/api/v1/reports`, { method: "POST", body: JSON.stringify({ patientId, reportType, encounterId }) }),
  listAuditLogs: (params: Record<string, string | undefined>) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
      .join("&");
    return request(`/api/v1/audit-logs?${qs}`);
  },
  manualDiagnosis: (encounterId: string, patientId: string, name: string, icd10Code?: string) =>
    request(`/api/v1/diagnoses/manual`, { method: "POST", body: JSON.stringify({ encounterId, patientId, name, icd10Code }) }),
};
