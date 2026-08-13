import { useEffect, useState } from "react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

export default function PatientsPage() {
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = useAuthStore((s) => s.roles.includes("SYSTEM_ADMIN"));

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPatients() {
    setLoading(true);
    try {
      const res = await api.searchPatients(q || "");
      const anyRes = res as any;
      setPatients(anyRes.items || anyRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this patient?")) return;
    try {
      await api.deletePatient(id);
      fetchPatients();
    } catch (err) {
      console.error(err);
      alert("Failed to remove patient");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Patients</h2>
        <div className="ml-auto flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded px-2 py-1 border" />
          <button onClick={fetchPatients} className="px-3 py-1 rounded border">Search</button>
        </div>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left">MRN</th>
              <th className="text-left">Name</th>
              <th className="text-left">DOB</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.medicalRecordNumber}</td>
                <td className="py-2">{p.firstName} {p.lastName}</td>
                <td className="py-2">{new Date(p.dateOfBirth).toLocaleDateString()}</td>
                <td className="py-2">
                  {isAdmin && <button onClick={() => handleDelete(p.id)} className="text-red-600">Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
