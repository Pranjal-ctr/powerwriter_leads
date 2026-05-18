import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const monthStart = utcMonthStart(new Date());

  const providers = await prisma.provider.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      monthlyQuota: true,
      monthlyUsages: {
        where: { monthStart },
        select: { assignedCount: true },
        take: 1,
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        take: 50,
        select: {
          assignedAt: true,
          lead: {
            select: {
              id: true,
              phone: true,
              rawPayload: true,
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  });

  return Response.json(
    {
      providers: providers.map((provider) => {
        const usedQuota = provider.monthlyUsages[0]?.assignedCount ?? 0;

        return {
          id: provider.id,
          name: provider.name,
          monthlyQuota: provider.monthlyQuota,
          usedQuota,
          remainingQuota: Math.max(provider.monthlyQuota - usedQuota, 0),
          leadsReceivedCount: provider._count.assignments,
          assignedLeads: provider.assignments.map((assignment) => {
            const payload = readLeadPayload(assignment.lead.rawPayload);

            return {
              id: assignment.lead.id,
              customerName: payload.name,
              phone: assignment.lead.phone,
              city: payload.city,
              service: assignment.lead.service.name,
              description: payload.description,
              assignedAt: assignment.assignedAt,
            };
          }),
        };
      }),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function readLeadPayload(payload: unknown): {
  name: string | null;
  city: string | null;
  description: string | null;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { name: null, city: null, description: null };
  }

  const record = payload as Record<string, unknown>;

  return {
    name: typeof record.name === "string" ? record.name : null,
    city: typeof record.city === "string" ? record.city : null,
    description: typeof record.description === "string" ? record.description : null,
  };
}
