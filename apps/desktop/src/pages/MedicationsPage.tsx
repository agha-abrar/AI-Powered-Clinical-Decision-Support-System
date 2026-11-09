import { useEffect, useState } from "react";
import { api } from "../lib/api-client";

export default function MedicationsPage() {
  const [q, setQ] = useState("");
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMeds() {
    setLoading(true);
    try {
      const res = await api.searchMedications(q || "");
      const anyRes = res as any;
      setMeds(anyRes.items || anyRes || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load medications");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Medications</h2>
        <div className="ml-auto flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meds" className="rounded px-2 py-1 border" />
          <button onClick={fetchMeds} className="px-3 py-1 rounded border">Search</button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Route</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meds.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="py-2">{m.name}</td>
                <td className="py-2">{m.route || "—"}</td>
                <td className="py-2">
                  <button onClick={() => alert(JSON.stringify(m, null, 2))} className="text-blue-600">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
