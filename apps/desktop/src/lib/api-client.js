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
    verifyMfa: (mfaSessionToken, code) => request("/api/v1/auth/mfa/verify", { method: "POST", body: JSON.stringify({ mfaSessionToken, code }) }, false),
    logout: (refreshToken) => request("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    healthDependencies: () => request("/api/v1/health/dependencies", {}, false),
    searchPatients: (query) => request(`/api/v1/patients?q=${encodeURIComponent(query)}`),
};
