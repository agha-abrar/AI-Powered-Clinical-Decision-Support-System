import { useAuthStore } from "../stores/auth-store";
const BASE_URL = window.cdssBridge?.apiBaseUrl ?? "http://localhost:3000";
export class ApiError extends Error {
    constructor(status, code, message, requestId) {
        super(message);
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.status = status;
        this.code = code;
        this.requestId = requestId;
    }
}
async function request(path, options = {}, auth = true) {
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
    if (res.status === 204)
        return undefined;
    return res.json();
}
export const api = {
    login: (identifier, password) => request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }, false),
    register: (body) => request("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }, false),
    verifyMfa: (mfaSessionToken, code) => request("/api/v1/auth/mfa/verify", { method: "POST", body: JSON.stringify({ mfaSessionToken, code }) }, false),
    logout: (refreshToken) => request("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    healthDependencies: () => request("/api/v1/health/dependencies", {}, false),
    searchPatients: (query) => request(`/api/v1/patients?q=${encodeURIComponent(query)}`),
    createPatient: (body) => request(`/api/v1/patients`, { method: "POST", body: JSON.stringify(body) }),
    createEncounter: (patientId, body) => request(`/api/v1/patients/${patientId}/encounters`, { method: "POST", body: JSON.stringify(body) }),
    deletePatient: (id) => request(`/api/v1/patients/${id}`, { method: "DELETE" }),
    getPatient: (id) => request(`/api/v1/patients/${id}`),
    updatePatient: (id, body) => request(`/api/v1/patients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    searchMedications: (q = "") => request(`/api/v1/medications?q=${encodeURIComponent(q)}&limit=100`),
    getMedication: (id) => request(`/api/v1/medications/${id}`),
    compileReport: (patientId, reportType, encounterId) => request(`/api/v1/reports`, { method: "POST", body: JSON.stringify({ patientId, reportType, encounterId }) }),
    listAuditLogs: (params) => {
        const qs = Object.entries(params)
            .filter(([, v]) => v)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
        return request(`/api/v1/audit-logs?${qs}`);
    },
    manualDiagnosis: (encounterId, patientId, name, icd10Code) => request(`/api/v1/diagnoses/manual`, { method: "POST", body: JSON.stringify({ encounterId, patientId, name, icd10Code }) }),
    listUsers: (page = 1, pageSize = 50) => request(`/api/v1/users?page=${page}&pageSize=${pageSize}`),
    createUser: (body) => request(`/api/v1/users`, { method: "POST", body: JSON.stringify(body) }),
    activateUser: (id) => request(`/api/v1/users/${id}/activate`, { method: "POST" }),
    deactivateUser: (id) => request(`/api/v1/users/${id}/deactivate`, { method: "POST" }),
    lockUser: (id) => request(`/api/v1/users/${id}/lock`, { method: "POST" }),
    unlockUser: (id) => request(`/api/v1/users/${id}/unlock`, { method: "POST" }),
    assignRoles: (id, roleNames) => request(`/api/v1/users/${id}/roles`, { method: "PUT", body: JSON.stringify({ roleNames }) }),
    createPrescription: (body) => request(`/api/v1/prescriptions`, { method: "POST", body: JSON.stringify(body) }),
    validatePrescription: (id) => request(`/api/v1/prescriptions/${id}/validate`, { method: "POST" }),
    finalizePrescription: (id) => request(`/api/v1/prescriptions/${id}/finalize`, { method: "POST" }),
    acknowledgeSafety: (safetyId, overrideReason) => request(`/api/v1/safety/acknowledge/${safetyId}`, { method: "POST", body: JSON.stringify({ overrideReason }) }),
    calculateDosage: (body) => request(`/api/v1/dosage/calculate`, { method: "POST", body: JSON.stringify(body) }),
    listPrescriptions: (params = {}) => {
        const qs = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&");
        return request(`/api/v1/prescriptions?${qs}`);
    },
    getPrescription: (id) => request(`/api/v1/prescriptions/${id}`),
};
