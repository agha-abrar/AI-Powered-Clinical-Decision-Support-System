import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const isAdmin = useAuthStore((s) => s.roles.includes("SYSTEM_ADMIN"));

  useEffect(() => {
    if (id) fetchPatient(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchPatient(pid: string) {
    setLoading(true);
    try {
      const res = await api.getPatient(pid);
      setPatient(res);
    } catch (err) {
      console.error(err);
      alert("Failed to load patient");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!patient) return <div className="p-6">No patient found</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-lg font-semibold">{patient.firstName} {patient.lastName}</h2>
        <div className="ml-auto flex gap-2">
          {isAdmin && (
            <button onClick={() => navigate(`/dashboard/patients/${patient.id}/edit`)} className="px-3 py-1 rounded border">
              Edit
            </button>
          )}
          <button onClick={() => navigate('/dashboard/patients')} className="px-3 py-1 rounded border">Back</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <div>
          <p className="text-sm text-slate-500">MRN</p>
          <p className="font-medium">{patient.medicalRecordNumber}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">DOB</p>
          <p className="font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Gender</p>
          <p className="font-medium">{patient.gender}</p>
        </div>
      </div>

    </div>
  );
}
