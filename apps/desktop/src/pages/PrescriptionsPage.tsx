import { useEffect, useState } from "react";
import { api } from "../lib/api-client";

export default function PrescriptionsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [meds, setMeds] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [medId, setMedId] = useState<string | null>(null);
  const [dose, setDose] = useState("500 mg");
  const [currentPrescription, setCurrentPrescription] = useState<any | null>(null);
  const [safetyResults, setSafetyResults] = useState<any[]>([]);
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchMeds();
  }, []);

  async function fetchPatients() {
    setLoading(true);
    try {
      const res = await api.searchPatients("");
      const anyRes = res as any;
      setPatients(anyRes.items || anyRes || []);
      if ((anyRes.items || anyRes || []).length) setPatientId((anyRes.items || anyRes)[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMeds() {
    try {
      const res = await api.searchMedications("");
      const anyRes = res as any;
      setMeds(anyRes.items || anyRes || []);
      if ((anyRes.items || anyRes || []).length) setMedId((anyRes.items || anyRes)[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  async function submitPrescription() {
    if (!patientId || !medId) return;
    setSubmitting(true);
    try {
      const body = {
        patientId,
        medications: [
          { medicationId: medId, doseText: dose, route: "ORAL", frequency: "BID" },
        ],
      };
      const pres = (await api.createPrescription(body as any)) as any;
      setCurrentPrescription(pres);
      alert("Prescription created: " + (pres?.id ?? "(unknown)"));
    } catch (err) {
      console.error(err);
      alert("Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  }

  async function validateCurrent() {
    if (!currentPrescription?.id) return;
    setSubmitting(true);
    try {
      const res = (await api.validatePrescription(currentPrescription.id)) as any;
      setSafetyResults(res.safetyChecks || res.checks || []);
      setValidated(true);
      alert("Validation completed");
    } catch (err) {
      console.error(err);
      alert("Validation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function finalizeCurrent() {
    if (!currentPrescription?.id) return;
    setSubmitting(true);
    try {
      const res = (await api.finalizePrescription(currentPrescription.id)) as any;
      alert("Prescription finalized: " + (res?.id ?? "(unknown)"));
      // clear form
      setCurrentPrescription(null);
      setSafetyResults([]);
      setValidated(false);
    } catch (err) {
      console.error(err);
      alert("Finalize failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function acknowledge(safetyId: string) {
    const reason = prompt("Enter override reason:");
    if (reason === null) return;
    setSubmitting(true);
    try {
      await api.acknowledgeSafety(safetyId, reason);
      // re-validate to refresh results
      await validateCurrent();
    } catch (err) {
      console.error(err);
      alert("Failed to acknowledge");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Prescriptions</h2>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Patient</label>
            <select value={patientId ?? ""} onChange={(e) => setPatientId(e.target.value)} className="w-full border rounded px-2 py-1">
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.medicalRecordNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Medication</label>
            <select value={medId ?? ""} onChange={(e) => setMedId(e.target.value)} className="w-full border rounded px-2 py-1">
              {meds.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Dose</label>
            <input value={dose} onChange={(e) => setDose(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={submitPrescription} disabled={submitting || !patientId || !medId} className="px-4 py-2 rounded bg-clinical-blue text-white">
            {submitting ? "Submitting…" : "Create prescription"}
            </button>
            <a href="/dashboard/prescriptions/list" className="px-3 py-1 rounded border">View drafts</a>
          </div>
        </div>
      )}
    </div>
  );
}
