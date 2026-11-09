import { useEffect, useState } from "react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

export default function UsersPage() {
  const isAdmin = useAuthStore((s) => s.roles.includes("SYSTEM_ADMIN"));
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.listUsers(1, 100);
      const anyRes = res as any;
      setUsers(anyRes.items || anyRes || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(u: any) {
    try {
      if (u.status === "ACTIVE") await api.deactivateUser(u.id);
      else await api.activateUser(u.id);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    }
  }

  async function toggleLock(u: any) {
    try {
      if (u.status === "LOCKED") await api.unlockUser(u.id);
      else await api.lockUser(u.id);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    }
  }

  async function addAdmin(u: any) {
    try {
      const roles = u.roles.map((r: any) => r.name);
      if (!roles.includes("SYSTEM_ADMIN")) roles.push("SYSTEM_ADMIN");
      await api.assignRoles(u.id, roles);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to assign role");
    }
  }

  if (!isAdmin) return <div className="p-6">Only system administrators can manage users.</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <button onClick={loadUsers} className="px-3 py-1 rounded border">Refresh</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left">Username</th>
              <th className="text-left">Email</th>
              <th className="text-left">Roles</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2">{u.username}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">{(u.roles || []).map((r: any) => r.role?.name || r.name || r).join(", ")}</td>
                <td className="py-2">{u.status}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(u)} className="text-blue-600">{u.status === "ACTIVE" ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => toggleLock(u)} className="text-red-600">{u.status === "LOCKED" ? "Unlock" : "Lock"}</button>
                    <button onClick={() => addAdmin(u)} className="text-green-600">Make admin</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
