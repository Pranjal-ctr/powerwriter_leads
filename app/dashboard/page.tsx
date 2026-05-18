"use client";

import { useCallback, useEffect, useState } from "react";

type AssignedLead = {
  id: string;
  customerName: string | null;
  phone: string;
  city: string | null;
  service: string;
  description: string | null;
  assignedAt: string;
};

type ProviderDashboardRow = {
  id: number;
  name: string;
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  leadsReceivedCount: number;
  assignedLeads: AssignedLead[];
};

type DashboardResponse = {
  providers: ProviderDashboardRow[];
};

export default function DashboardPage() {
  const [providers, setProviders] = useState<ProviderDashboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "reconnecting">("connecting");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load dashboard data.");
      const data = (await response.json()) as DashboardResponse;
      setProviders(data.providers);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load dashboard data.");
        return (await response.json()) as DashboardResponse;
      })
      .then((data) => {
        if (!cancelled) {
          setProviders(data.providers);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onopen = () => setLiveStatus("live");
    source.onerror = () => setLiveStatus("reconnecting");
    source.addEventListener("LEAD_ASSIGNED", () => void loadDashboard());
    source.addEventListener("QUOTA_UPDATED", () => void loadDashboard());

    return () => source.close();
  }, [loadDashboard]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Operations</p>
          <h1 className="text-3xl font-semibold tracking-tight">Provider dashboard</h1>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Realtime status: <span className="font-medium">{liveStatus}</span>
        </p>
      </header>

      {isLoading ? <DashboardSkeleton /> : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p className="font-medium">Couldn&apos;t load dashboard data.</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 py-2 font-medium focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-800"
          >
            Try again
          </button>
        </section>
      ) : null}

      {!isLoading && !error && providers.length === 0 ? (
        <section className="rounded-2xl border border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          No providers found.
        </section>
      ) : null}

      {!isLoading && !error ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article key={provider.id} className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{provider.name}</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Leads received: {provider.leadsReceivedCount}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <QuotaStat label="Quota" value={provider.monthlyQuota} />
                  <QuotaStat label="Used" value={provider.usedQuota} />
                  <QuotaStat label="Remaining" value={provider.remainingQuota} />
                </dl>
              </div>

              <div className="mt-4 space-y-3">
                {provider.assignedLeads.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No assigned leads yet.</p>
                ) : (
                  provider.assignedLeads.map((lead) => (
                    <div key={lead.id} className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <p className="font-medium">{lead.customerName ?? "Unnamed customer"}</p>
                        <time className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatTimestamp(lead.assignedAt)}
                        </time>
                      </div>
                      <p className="mt-2 text-zinc-700 dark:text-zinc-300">{lead.phone}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {[lead.city, lead.service].filter(Boolean).join(" • ")}
                      </p>
                      <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                        {lead.description ?? "No description provided."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

function QuotaStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Loading dashboard">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </section>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
