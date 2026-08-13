import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";
export default function PatientsPage() {
    const [q, setQ] = useState("");
    const [patients, setPatients] = useState([]);
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
            setPatients(res.items || res);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleDelete(id) {
        if (!confirm("Remove this patient?"))
            return;
        try {
            await api.deletePatient(id);
            fetchPatients();
        }
        catch (err) {
            console.error(err);
            alert("Failed to remove patient");
        }
    }
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Patients" }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search", className: "rounded px-2 py-1 border" }), _jsx("button", { onClick: fetchPatients, className: "px-3 py-1 rounded border", children: "Search" })] })] }), loading ? (_jsx("div", { children: "Loading\u2026" })) : (_jsxs("table", { className: "w-full table-auto", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-left", children: "MRN" }), _jsx("th", { className: "text-left", children: "Name" }), _jsx("th", { className: "text-left", children: "DOB" }), _jsx("th", { className: "text-left", children: "Actions" })] }) }), _jsx("tbody", { children: patients.map((p) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "py-2", children: p.medicalRecordNumber }), _jsxs("td", { className: "py-2", children: [p.firstName, " ", p.lastName] }), _jsx("td", { className: "py-2", children: new Date(p.dateOfBirth).toLocaleDateString() }), _jsx("td", { className: "py-2", children: isAdmin && _jsx("button", { onClick: () => handleDelete(p.id), className: "text-red-600", children: "Remove" }) })] }, p.id))) })] }))] }));
}
