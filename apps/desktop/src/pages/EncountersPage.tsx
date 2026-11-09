import { useEffect, useState } from "react";
import { api } from "../lib/api-client";

export default function EncountersPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("Routine visit");

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    setLoading(true);
    try {
      const res = await api.searchPatients("");
      const anyRes = res as any;
      setPatients(anyRes.items || anyRes || []);
      if ((anyRes.items || anyRes || []).length) setSelected((anyRes.items || anyRes)[0].id);
    } catch (err) {
      console.error(err);
      alert("Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  async function createEncounter() {
    if (!selected) return;
    setBusy(selected);
    try {
      const enc = (await api.createEncounter(selected, { encounterType: "OUTPATIENT", chiefComplaint })) as any;
      alert("Encounter created: " + (enc?.id ?? "(unknown)"));
    } catch (err) {
      console.error(err);
      alert("Failed to create encounter");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Encounters</h2>
      {loading ? (
        <div>Loading patients…</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Patient</label>
            <select value={selected ?? ""} onChange={(e) => setSelected(e.target.value)} className="w-full border rounded px-2 py-1">
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.medicalRecordNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Chief complaint</label>
            <input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <button onClick={createEncounter} disabled={!selected || !!busy} className="px-4 py-2 rounded bg-clinical-blue text-white">
            {busy ? "Creating…" : "Create encounter"}
          </button>
        </div>
      )}
    </div>
  );
}
