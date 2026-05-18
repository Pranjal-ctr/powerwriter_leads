"use client";

import { FormEvent, useState } from "react";
import { SERVICE_TYPES } from "@/lib/validation";

type LeadFormState = {
  name: string;
  phone: string;
  city: string;
  serviceType: (typeof SERVICE_TYPES)[number] | "";
  description: string;
};

type FieldErrors = Partial<Record<keyof LeadFormState, string>>;

type ApiErrorResponse = {
  message?: string;
  issues?: Array<{ path: string; message: string }>;
};

const initialFormState: LeadFormState = {
  name: "",
  phone: "",
  city: "",
  serviceType: "",
  description: "",
};

export default function RequestServicePage() {
  const [form, setForm] = useState(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateForm(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStatus("error");
      setMessage("Please fix the highlighted fields.");
      return;
    }

    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        const nextErrors = toFieldErrors(data);
        setFieldErrors(nextErrors);
        setStatus("error");
        setMessage(data.message ?? "Could not submit your request.");
        return;
      }

      setForm(initialFormState);
      setFieldErrors({});
      setStatus("success");
      setMessage("Request submitted successfully.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Customer intake</p>
        <h1 className="text-3xl font-semibold tracking-tight">Request a service</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Submit one request and we&apos;ll distribute it to eligible providers.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <TextField
          id="name"
          label="Name"
          value={form.name}
          autoComplete="name"
          error={fieldErrors.name}
          onChange={(value) => updateField("name", value)}
        />
        <TextField
          id="phone"
          label="Phone Number"
          value={form.phone}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          error={fieldErrors.phone}
          onChange={(value) => updateField("phone", value)}
        />
        <TextField
          id="city"
          label="City"
          value={form.city}
          autoComplete="address-level2"
          error={fieldErrors.city}
          onChange={(value) => updateField("city", value)}
        />

        <div className="space-y-2">
          <label htmlFor="serviceType" className="block text-sm font-medium">
            Service Type
          </label>
          <select
            id="serviceType"
            value={form.serviceType}
            onChange={(event) => updateField("serviceType", event.target.value as LeadFormState["serviceType"])}
            aria-invalid={fieldErrors.serviceType ? "true" : undefined}
            aria-describedby={fieldErrors.serviceType ? "serviceType-error" : undefined}
            className="min-h-11 w-full rounded-lg border border-zinc-300 bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:border-zinc-700"
          >
            <option value="">Select a service</option>
            {SERVICE_TYPES.map((serviceType) => (
              <option key={serviceType} value={serviceType}>
                {serviceType}
              </option>
            ))}
          </select>
          {fieldErrors.serviceType ? (
            <p id="serviceType-error" className="text-sm text-red-600 dark:text-red-400">
              {fieldErrors.serviceType}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            aria-invalid={fieldErrors.description ? "true" : undefined}
            aria-describedby={fieldErrors.description ? "description-error" : undefined}
            rows={5}
            className="w-full rounded-lg border border-zinc-300 bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:border-zinc-700"
          />
          {fieldErrors.description ? (
            <p id="description-error" className="text-sm text-red-600 dark:text-red-400">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        {message ? (
          <p
            className={
              status === "success"
                ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            }
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          aria-busy={status === "submitting"}
          className="min-h-11 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {status === "submitting" ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </main>
  );

  function updateField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }
}

function TextField({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
}: {
  id: keyof LeadFormState;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "text" | "tel" | "numeric";
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:border-zinc-700"
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function validateForm(form: LeadFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) errors.name = "Name is required.";
  if (!/^\d{10,}$/.test(form.phone.trim())) errors.phone = "Phone must contain at least 10 digits.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.serviceType) errors.serviceType = "Service type is required.";
  if (!form.description.trim()) errors.description = "Description is required.";

  return errors;
}

function toFieldErrors(response: ApiErrorResponse): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of response.issues ?? []) {
    if (issue.path in initialFormState) {
      errors[issue.path as keyof LeadFormState] = issue.message;
    }
  }

  return errors;
}
