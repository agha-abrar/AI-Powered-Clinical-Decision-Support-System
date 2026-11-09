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

function RequireAuth({ children }: { children: JSX.Element }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/patients"
        element={
          <RequireAuth>
            <PatientsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/patients/new"
        element={
          <RequireAuth>
            <CreatePatientPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/patients/:id"
        element={
          <RequireAuth>
            <PatientDetails />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/patients/:id/edit"
        element={
          <RequireAuth>
            <EditPatientPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/reports"
        element={
          <RequireAuth>
            <ReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/users"
        element={
          <RequireAuth>
            <UsersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/medications"
        element={
          <RequireAuth>
            <MedicationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/encounters"
        element={
          <RequireAuth>
            <EncountersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/prescriptions"
        element={
          <RequireAuth>
            <PrescriptionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/prescriptions/list"
        element={
          <RequireAuth>
            <PrescriptionsListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/prescriptions/:id"
        element={
          <RequireAuth>
            <PrescriptionDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/audit"
        element={
          <RequireAuth>
            <AuditLogsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/diagnosis"
        element={
          <RequireAuth>
            <DiagnosisPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
