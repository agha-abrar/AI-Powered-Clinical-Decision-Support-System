import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../lib/api-client";

type FormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  gender?: string;
};

export default function CreatePatientPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm<FormValues>({ defaultValues: { gender: "other" } });

  async function onSubmit(values: FormValues) {
    try {
      await api.createPatient({
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        medicalRecordNumber: values.medicalRecordNumber,
        gender: values.gender,
      });
      navigate("/dashboard/patients");
    } catch (err) {
      console.error(err);
      alert("Failed to create patient");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Create Patient</h2>
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
            Create
          </button>
          <button type="button" onClick={() => navigate("/dashboard/patients")} className="px-4 py-2 rounded border">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
