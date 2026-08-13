import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";

type FormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  gender?: string;
};

export default function EditPatientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>();

  useEffect(() => {
    if (!id) return;
    api.getPatient(id).then((p) => reset({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth?.split('T')[0],
      medicalRecordNumber: p.medicalRecordNumber,
      gender: p.gender,
    })).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values: FormValues) {
    if (!id) return;
    try {
      await api.updatePatient(id, values);
      navigate(`/dashboard/patients/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update patient");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Edit Patient</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">First name</label>
            <input {...register("firstName", { required: true })} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">Last name</label>
            <input {...register("lastName", { required: true })} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">DOB</label>
            <input type="date" {...register("dateOfBirth", { required: true })} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">MRN</label>
            <input {...register("medicalRecordNumber", { required: true })} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">Gender</label>
            <select {...register("gender")} className="w-full border rounded px-2 py-1">
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={formState.isSubmitting} className="px-4 py-2 rounded bg-clinical-blue text-white">
            Save
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded border">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
