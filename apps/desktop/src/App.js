import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import CreatePatientPage from "./pages/CreatePatient";
import PatientDetails from "./pages/PatientDetails";
import EditPatientPage from "./pages/EditPatient";
import ReportsPage from "./pages/ReportsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import DiagnosisPage from "./pages/DiagnosisPage";
import UsersPage from "./pages/UsersPage";
import MedicationsPage from "./pages/MedicationsPage";
import EncountersPage from "./pages/EncountersPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import PrescriptionsListPage from "./pages/PrescriptionsListPage";
import PrescriptionDetailPage from "./pages/PrescriptionDetailPage";
import { useAuthStore } from "./stores/auth-store";
function RequireAuth({ children }) {
    const accessToken = useAuthStore((s) => s.accessToken);
    if (!accessToken)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(RequireAuth, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/dashboard/patients", element: _jsx(RequireAuth, { children: _jsx(PatientsPage, {}) }) }), _jsx(Route, { path: "/dashboard/patients/new", element: _jsx(RequireAuth, { children: _jsx(CreatePatientPage, {}) }) }), _jsx(Route, { path: "/dashboard/patients/:id", element: _jsx(RequireAuth, { children: _jsx(PatientDetails, {}) }) }), _jsx(Route, { path: "/dashboard/patients/:id/edit", element: _jsx(RequireAuth, { children: _jsx(EditPatientPage, {}) }) }), _jsx(Route, { path: "/dashboard/reports", element: _jsx(RequireAuth, { children: _jsx(ReportsPage, {}) }) }), _jsx(Route, { path: "/dashboard/users", element: _jsx(RequireAuth, { children: _jsx(UsersPage, {}) }) }), _jsx(Route, { path: "/dashboard/medications", element: _jsx(RequireAuth, { children: _jsx(MedicationsPage, {}) }) }), _jsx(Route, { path: "/dashboard/encounters", element: _jsx(RequireAuth, { children: _jsx(EncountersPage, {}) }) }), _jsx(Route, { path: "/dashboard/prescriptions", element: _jsx(RequireAuth, { children: _jsx(PrescriptionsPage, {}) }) }), _jsx(Route, { path: "/dashboard/prescriptions/list", element: _jsx(RequireAuth, { children: _jsx(PrescriptionsListPage, {}) }) }), _jsx(Route, { path: "/dashboard/prescriptions/:id", element: _jsx(RequireAuth, { children: _jsx(PrescriptionDetailPage, {}) }) }), _jsx(Route, { path: "/dashboard/audit", element: _jsx(RequireAuth, { children: _jsx(AuditLogsPage, {}) }) }), _jsx(Route, { path: "/dashboard/diagnosis", element: _jsx(RequireAuth, { children: _jsx(DiagnosisPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }));
}
