import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";

export default function PrescriptionsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.listPrescriptions({ page: 1, pageSize: 50 });
      const anyRes = res as any;
      setItems(anyRes.items || anyRes || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Prescriptions</h2>
        <button onClick={load} className="px-3 py-1 rounded border">Refresh</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left">ID</th>
              <th className="text-left">Patient</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.id}</td>
                <td className="py-2">{p.patient?.firstName} {p.patient?.lastName}</td>
                <td className="py-2">{p.status}</td>
                <td className="py-2">
                  <button onClick={() => navigate(`/dashboard/prescriptions/${p.id}`)} className="text-blue-600">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
