import {
  AssignmentKind,
  DashboardEventType,
  Prisma,
  ServiceProviderRole,
  type Lead,
  type LeadAssignment,
} from "@/app/generated/prisma/client";
import { ASSIGNMENTS_PER_LEAD } from "@/lib/constants";
import { broadcast } from "@/lib/events";
import { prisma } from "@/lib/prisma";

type AllocationRuleRow = {
  providerId: number;
  role: ServiceProviderRole;
  position: number;
  monthlyQuota: number;
  active: boolean;
};

type CursorRow = {
  serviceId: number;
  nextPosition: number;
};

type QuotaRow = {
  providerId: number;
  assignedCount: number;
};

type CandidateProvider = {
  providerId: number;
  monthlyQuota: number;
};

type SelectedProvider = CandidateProvider & {
  kind: AssignmentKind;
};

export type AllocateLeadInput = {
  phone: string;
  serviceId: number;
  source?: string;
  rawPayload?: Prisma.InputJsonValue;
  now?: Date;
};

export type AllocationResult = {
  lead: Lead;
  assignments: LeadAssignment[];
  dashboardEventId: bigint;
};

export class AllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllocationError";
  }
}

export async function allocateLead(input: AllocateLeadInput): Promise<AllocationResult> {
  const now = input.now ?? new Date();
  const monthStart = utcMonthStart(now);

  const allocation = await prisma.$transaction(async (tx) => {
    const cursor = await lockCursor(tx, input.serviceId);
    const rules = await loadRules(tx, input.serviceId);

    if (rules.length === 0) {
      throw new AllocationError(`No allocation rules configured for service ${input.serviceId}.`);
    }

    const providerIds = [...new Set(rules.map((rule) => rule.providerId))].sort((a, b) => a - b);
    const quotaByProviderId = await lockQuotaRows(tx, providerIds, monthStart);

    const selectedProviders = selectProviders(rules, quotaByProviderId, cursor.nextPosition);

    if (selectedProviders.providers.length !== ASSIGNMENTS_PER_LEAD) {
      throw new AllocationError(
        `Unable to allocate exactly ${ASSIGNMENTS_PER_LEAD} providers for service ${input.serviceId}.`,
      );
    }

    const lead = await tx.lead.create({
      data: {
        phone: input.phone,
        serviceId: input.serviceId,
        source: input.source,
        rawPayload: input.rawPayload,
      },
    });

    const assignments = await Promise.all(
      selectedProviders.providers.map((provider, slot) =>
        tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            providerId: provider.providerId,
            slot,
            kind: provider.kind,
          },
        }),
      ),
    );

    for (const provider of selectedProviders.providers) {
      await tx.providerMonthlyUsage.update({
        where: {
          providerId_monthStart: {
            providerId: provider.providerId,
            monthStart,
          },
        },
        data: {
          assignedCount: { increment: 1 },
        },
      });
    }

    await tx.roundRobinCursor.update({
      where: { serviceId: input.serviceId },
      data: { nextPosition: selectedProviders.nextCursorPosition },
    });

    const dashboardEvent = await tx.dashboardEvent.create({
      data: {
        type: DashboardEventType.LEAD_ASSIGNED,
        leadId: lead.id,
        payload: {
          leadId: lead.id,
          serviceId: lead.serviceId,
          providerIds: assignments.map((assignment) => assignment.providerId),
        },
      },
    });

    return { lead, assignments, dashboardEventId: dashboardEvent.id };
  });

  broadcast({
    id: allocation.dashboardEventId.toString(),
    event: DashboardEventType.LEAD_ASSIGNED,
    data: {
      leadId: allocation.lead.id,
      serviceId: allocation.lead.serviceId,
      providerIds: allocation.assignments.map((assignment) => assignment.providerId),
    },
  });

  return allocation;
}

function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

async function lockCursor(
  tx: Prisma.TransactionClient,
  serviceId: number,
): Promise<CursorRow> {
  const rows = await tx.$queryRaw<CursorRow[]>`
    SELECT
      "serviceId",
      "nextPosition"
    FROM round_robin_cursors
    WHERE "serviceId" = ${serviceId}
    FOR UPDATE
  `;

  const cursor = rows[0];

  if (!cursor) {
    throw new AllocationError(`Missing round-robin cursor for service ${serviceId}.`);
  }

  return cursor;
}

async function loadRules(
  tx: Prisma.TransactionClient,
  serviceId: number,
): Promise<AllocationRuleRow[]> {
  return tx.$queryRaw<AllocationRuleRow[]>`
    SELECT
      spr."providerId",
      spr.role::text AS "role",
      spr.position AS "position",
      p."monthlyQuota",
      p.active AS "active"
    FROM service_provider_rules spr
    INNER JOIN providers p ON p.id = spr."providerId"
    WHERE spr."serviceId" = ${serviceId}
    ORDER BY spr.role, spr.position
  `;
}

async function lockQuotaRows(
  tx: Prisma.TransactionClient,
  providerIds: number[],
  monthStart: Date,
): Promise<Map<number, QuotaRow>> {
  if (providerIds.length === 0) {
    return new Map();
  }

  await tx.$executeRaw`
    INSERT INTO provider_monthly_usages ("providerId", "monthStart", "assignedCount", "createdAt", "updatedAt")
    SELECT provider_id, ${monthStart}::date, 0, NOW(), NOW()
    FROM UNNEST(${providerIds}::int[]) AS provider_id
    ON CONFLICT ("providerId", "monthStart") DO NOTHING
  `;

  const rows = await tx.$queryRaw<QuotaRow[]>`
    SELECT
      "providerId",
      "assignedCount"
    FROM provider_monthly_usages
    WHERE "monthStart" = ${monthStart}::date
      AND "providerId" = ANY(${providerIds}::int[])
    ORDER BY "providerId"
    FOR UPDATE
  `;

  if (rows.length !== providerIds.length) {
    throw new AllocationError("Failed to lock every provider quota row required for allocation.");
  }

  return new Map(rows.map((row) => [row.providerId, row]));
}

function selectProviders(
  rules: AllocationRuleRow[],
  quotaByProviderId: Map<number, QuotaRow>,
  nextPosition: number,
): { providers: SelectedProvider[]; nextCursorPosition: number } {
  const mandatory = rules
    .filter((rule) => rule.role === ServiceProviderRole.MANDATORY)
    .sort((a, b) => a.position - b.position);
  const fairPool = rules
    .filter((rule) => rule.role === ServiceProviderRole.FAIR_POOL)
    .sort((a, b) => a.position - b.position);

  if (fairPool.length === 0) {
    throw new AllocationError("Fair pool cannot be empty.");
  }

  const selected: SelectedProvider[] = [];
  const selectedIds = new Set<number>();

  for (const rule of mandatory) {
    if (selected.length === ASSIGNMENTS_PER_LEAD) {
      break;
    }

    if (isEligible(rule, quotaByProviderId, selectedIds)) {
      selected.push({
        providerId: rule.providerId,
        monthlyQuota: rule.monthlyQuota,
        kind: AssignmentKind.MANDATORY,
      });
      selectedIds.add(rule.providerId);
    }
  }

  const normalizedStart = modulo(nextPosition, fairPool.length);
  let nextCursorPosition = normalizedStart;

  for (let offset = 0; offset < fairPool.length && selected.length < ASSIGNMENTS_PER_LEAD; offset += 1) {
    const position = modulo(normalizedStart + offset, fairPool.length);
    const rule = fairPool[position];

    nextCursorPosition = modulo(position + 1, fairPool.length);

    if (!isEligible(rule, quotaByProviderId, selectedIds)) {
      continue;
    }

    selected.push({
      providerId: rule.providerId,
      monthlyQuota: rule.monthlyQuota,
      kind: AssignmentKind.FAIR_POOL,
    });
    selectedIds.add(rule.providerId);
  }

  return { providers: selected, nextCursorPosition };
}

function isEligible(
  rule: AllocationRuleRow,
  quotaByProviderId: Map<number, QuotaRow>,
  selectedIds: Set<number>,
): boolean {
  if (!rule.active || selectedIds.has(rule.providerId)) {
    return false;
  }

  const quota = quotaByProviderId.get(rule.providerId);

  if (!quota) {
    throw new AllocationError(`Missing locked quota row for provider ${rule.providerId}.`);
  }

  return quota.assignedCount < rule.monthlyQuota;
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
