import { useEffect, useState } from "react";
import { api } from "../lib/api-client";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await api.listAuditLogs({ page: "1", pageSize: "20" });
      const anyRes = res as any;
      setLogs(anyRes.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Audit Logs</h2>
        <button onClick={loadLogs} className="px-3 py-1 rounded border">Refresh</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <strong>{log.action}</strong>
                <span className="text-xs uppercase px-2 py-1 rounded bg-slate-100">{log.severity}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{log.message || "Audit event"}</p>
              <p className="text-xs text-slate-500 mt-2">
                {new Date(log.timestamp).toLocaleString()} • {log.patientId ? `Patient ${log.patientId}` : "System"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
