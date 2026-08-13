import { useEffect, useState } from "react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

export default function DiagnosisPage() {
  const roles = useAuthStore((s) => s.roles);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [diagnosisName, setDiagnosisName] = useState("Hypotension");
  const [icd10Code, setIcd10Code] = useState("I95");
  const [chiefComplaint, setChiefComplaint] = useState("Routine evaluation");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canDiagnose = roles.includes("PHYSICIAN") || roles.includes("SYSTEM_ADMIN");

  useEffect(() => {
    if (!canDiagnose) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDiagnose]);

  async function fetchPatients() {
    setLoading(true);
    try {
      const res = await api.searchPatients("");
      const anyRes = res as any;
      setPatients(anyRes.items || anyRes || []);
      if ((anyRes.items || anyRes || []).length) {
        setSelectedId((anyRes.items || anyRes)[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualDiagnosis() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const encounter = (await api.createEncounter(selectedId, {
        encounterType: "OUTPATIENT",
        chiefComplaint,
      })) as any;
      const diagnosis = await api.manualDiagnosis(encounter.id, selectedId, diagnosisName, icd10Code);
      console.log(diagnosis);
      alert("Diagnosis recorded successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to create diagnosis");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canDiagnose) {
    return <div className="p-6">Only physicians can access this workflow.</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Manual diagnosis</h2>

      {loading ? (
        <div>Loading patients…</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Patient</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full border rounded px-2 py-1">
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.medicalRecordNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Chief complaint</label>
            <input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-sm mb-1">Diagnosis</label>
            <input value={diagnosisName} onChange={(e) => setDiagnosisName(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-sm mb-1">ICD-10</label>
            <input value={icd10Code} onChange={(e) => setIcd10Code(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <button
            onClick={handleManualDiagnosis}
            disabled={submitting || !selectedId}
            className="px-4 py-2 rounded bg-clinical-blue text-white disabled:opacity-50"
          >
            {submitting ? "Recording…" : "Record diagnosis"}
          </button>
        </div>
      )}
    </div>
  );
}
