"use client";

import { useState } from "react";

type GenericResponse = Record<string, unknown>;

type GenerateLeadsResponse = {
  successes: number;
  failures: number;
  details: Array<Record<string, unknown>>;
};

export default function TestToolsPage() {
  const [resetResult, setResetResult] = useState<GenericResponse | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<GenericResponse[] | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateLeadsResponse | null>(null);
  const [loadingAction, setLoadingAction] = useState<"reset" | "duplicate" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resetQuota() {
    await runAction("reset", async () => {
      const response = await postJson("/api/webhook/payment", {
        eventId: crypto.randomUUID(),
        type: "subscription_paid",
      });
      setResetResult(response);
    });
  }

  async function duplicateWebhookTest() {
    await runAction("duplicate", async () => {
      const eventId = crypto.randomUUID();
      const results = await Promise.all([
        postJson("/api/webhook/payment", { eventId, type: "subscription_paid" }),
        postJson("/api/webhook/payment", { eventId, type: "subscription_paid" }),
        postJson("/api/webhook/payment", { eventId, type: "subscription_paid" }),
      ]);
      setDuplicateResult(results);
    });
  }

  async function generateLeads() {
    await runAction("generate", async () => {
      const response = await postJson<GenerateLeadsResponse>("/api/test/generate-leads", undefined);
      setGenerateResult(response);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">Test tools</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Exercise the real webhook and allocator paths without mock data.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <ToolCard
          title="Reset quota webhook"
          description="Send one unique subscription_paid event."
          buttonLabel="Reset quotas"
          loading={loadingAction === "reset"}
          onClick={() => void resetQuota()}
        />
        <ToolCard
          title="Duplicate webhook test"
          description="Send the same event ID three times."
          buttonLabel="Run duplicate test"
          loading={loadingAction === "duplicate"}
          onClick={() => void duplicateWebhookTest()}
        />
        <ToolCard
          title="Concurrent lead burst"
          description="Create 10 real allocations at once."
          buttonLabel="Generate 10 leads"
          loading={loadingAction === "generate"}
          onClick={() => void generateLeads()}
        />
      </section>

      <ResultPanel title="Reset quota result" value={resetResult} />
      <ResultPanel title="Duplicate webhook result" value={duplicateResult} />

      <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Concurrent leads result</h2>
        {!generateResult ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No run yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex gap-6 text-sm">
              <p>
                <span className="text-zinc-500 dark:text-zinc-400">Successes:</span> {generateResult.successes}
              </p>
              <p>
                <span className="text-zinc-500 dark:text-zinc-400">Failures:</span> {generateResult.failures}
              </p>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
              {JSON.stringify(generateResult.details, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </main>
  );

  async function runAction(action: NonNullable<typeof loadingAction>, work: () => Promise<void>) {
    setLoadingAction(action);
    setError(null);

    try {
      await work();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setLoadingAction(null);
    }
  }
}

function ToolCard({
  title,
  description,
  buttonLabel,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        className="mt-4 min-h-11 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Working..." : buttonLabel}
      </button>
    </article>
  );
}

function ResultPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{title}</h2>
      {!value ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No run yet.</p>
      ) : (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </section>
  );
}

async function postJson<T = GenericResponse>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed.");
  }

  return data;
}
