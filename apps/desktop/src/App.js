import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import { useAuthStore } from "./stores/auth-store";
function RequireAuth({ children }) {
    const accessToken = useAuthStore((s) => s.accessToken);
    if (!accessToken)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(RequireAuth, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/dashboard/patients", element: _jsx(RequireAuth, { children: _jsx(PatientsPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }));
}
