import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import CreatePatientPage from "./pages/CreatePatient";
import PatientDetails from "./pages/PatientDetails";
import EditPatientPage from "./pages/EditPatient";
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
