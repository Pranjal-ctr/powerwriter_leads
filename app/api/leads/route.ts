import { Prisma } from "@/app/generated/prisma/client";
import { allocateLead } from "@/lib/allocator";
import { SERVICES } from "@/lib/constants";
import { getPrisma } from "@/lib/prisma";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validation";

export const runtime = "nodejs";

type ServiceType = CreateLeadInput["serviceType"];

const serviceCodeByName = new Map<ServiceType, (typeof SERVICES)[number]["code"]>(
  SERVICES.map((service) => [service.name, service.code]),
);

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Request body must be valid JSON." }, 400);
  }

  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Validation failed.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const input = parsed.data;
  const serviceCode = serviceCodeByName.get(input.serviceType);

  if (!serviceCode) {
    return jsonResponse({ message: "Unknown service type." }, 400);
  }

  try {
    const prisma = getPrisma();
    const service = await prisma.service.findUnique({
      where: { code: serviceCode },
      select: { id: true, code: true, name: true },
    });

    if (!service) {
      return jsonResponse({ message: "Requested service is not configured." }, 500);
    }

    const allocation = await allocateLead({
      phone: input.phone,
      serviceId: service.id,
      source: "api",
      rawPayload: {
        name: input.name,
        phone: input.phone,
        city: input.city,
        serviceType: input.serviceType,
        description: input.description,
      },
    });

    const providers = await prisma.provider.findMany({
      where: {
        id: { in: allocation.assignments.map((assignment) => assignment.providerId) },
      },
      select: { id: true, code: true, name: true },
    });

    const providerById = new Map(providers.map((provider) => [provider.id, provider]));

    return jsonResponse(
      {
        lead: {
          id: allocation.lead.id,
          phone: allocation.lead.phone,
          service: {
            id: service.id,
            code: service.code,
            name: service.name,
          },
          createdAt: allocation.lead.createdAt,
        },
        assignedProviders: allocation.assignments
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((assignment) => {
            const provider = providerById.get(assignment.providerId);

            if (!provider) {
              throw new Error(`Missing provider ${assignment.providerId} after allocation.`);
            }

            return {
              id: provider.id,
              code: provider.code,
              name: provider.name,
              assignmentKind: assignment.kind,
              slot: assignment.slot,
            };
          }),
      },
      201,
    );
  } catch (error) {
    if (isDuplicateLeadError(error)) {
      return jsonResponse(
        {
          message: "A lead with this phone number already exists for the selected service.",
        },
        409,
      );
    }

    console.error("Failed to create lead", error);
    return jsonResponse({ message: "Internal server error." }, 500);
  }
}

function isDuplicateLeadError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    error.meta?.modelName === "Lead"
  );
}

function jsonResponse<T>(body: T, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
