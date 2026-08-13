import { useEffect, useState } from "react";
import { api } from "../lib/api-client";

export default function ReportsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPatients() {
    setLoading(true);
    try {
      const res = await api.searchPatients("");
      const anyRes = res as any;
      setPatients(anyRes.items || anyRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(patientId: string) {
    setBusyId(patientId);
    try {
      const report = await api.compileReport(patientId, "FULL_CLINICAL");
      console.log(report);
      alert("Clinical report generated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to generate report");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Reports</h2>
        <button onClick={fetchPatients} className="px-3 py-1 rounded border">Refresh</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left">MRN</th>
              <th className="text-left">Patient</th>
              <th className="text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.medicalRecordNumber}</td>
                <td className="py-2">{p.firstName} {p.lastName}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleGenerate(p.id)}
                    className="px-3 py-1 rounded bg-clinical-blue text-white disabled:opacity-50"
                    disabled={busyId === p.id}
                  >
                    {busyId === p.id ? "Generating…" : "Generate report"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
