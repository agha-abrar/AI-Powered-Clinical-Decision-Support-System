import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api-client";

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const [pres, setPres] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPrescription(id!);
      setPres(res as any);
    } catch (err) {
      console.error(err);
      alert("Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }

  if (!id) return <div className="p-6">No prescription specified.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (!pres) return <div className="p-6">Not found.</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-lg font-semibold">Prescription {pres.id}</h2>
      <p className="text-sm text-slate-500">Patient: {pres.patient?.firstName} {pres.patient?.lastName}</p>
      <p className="mt-3">Status: {pres.status}</p>

      <div className="mt-4">
        <h4 className="font-medium">Items</h4>
        <ul className="mt-2 space-y-2">
          {pres.items.map((i: any) => (
            <li key={i.id} className="rounded border p-2">
              <div className="font-medium">{i.medicationId}</div>
              <div className="text-sm text-slate-600">Dose: {i.doseText ?? `${i.dose} ${i.doseUnit}`}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="font-medium">Safety checks</h4>
        <div className="mt-2 space-y-2">
          {(pres.safetyChecks || []).map((s: any) => (
            <div key={s.id} className="rounded border p-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{s.checkType}</div>
                  <div className="text-xs text-slate-500">Severity: {s.severity}</div>
                </div>
                <div className="text-sm">{s.blocked ? <span className="text-red-600">Blocked</span> : <span className="text-emerald-600">OK</span>}</div>
              </div>
              <div className="mt-2 text-sm text-slate-700">{s.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
