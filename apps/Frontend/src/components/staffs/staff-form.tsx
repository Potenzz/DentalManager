import React, { useState, useEffect } from "react";
import { StaffUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
import { z } from "zod";

type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

interface StaffFormProps {
  initialData?: Partial<Staff>;
  onSubmit: (data: Omit<Staff, "id" | "createdAt">) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StaffForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: StaffFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
  const [phone, setPhone] = useState("");

  const [hasTypedRole, setHasTypedRole] = useState(false);

  // Set initial values once on mount
  useEffect(() => {
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.email) setEmail(initialData.email);
      if (initialData.role) setRole(initialData.role);
      if (initialData.phone) setPhone(initialData.phone);
    }
  }, []); // run once only

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      role: role.trim(),
      phone: phone.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          type="text"
          className="mt-1 block w-full border rounded p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          className="mt-1 block w-full border rounded p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Role *
        </label>
        <input
          type="text"
          className="mt-1 block w-full border rounded p-2"
          value={role}
          onChange={(e) => {
            setHasTypedRole(true);
            setRole(e.target.value);
          }}
          onFocus={() => {
            if (!hasTypedRole && role === "Staff") {
              setRole("");
            }
          }}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          className="mt-1 block w-full border rounded p-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
