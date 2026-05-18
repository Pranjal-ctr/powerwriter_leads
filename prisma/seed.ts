import { Prisma, PrismaClient, ServiceProviderRole } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PROVIDERS,
  SERVICE_DISTRIBUTION_RULES,
  SERVICES,
  type ProviderCode,
} from "../lib/constants";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await Promise.all(
    SERVICES.map((service) =>
      prisma.service.upsert({
        where: { code: service.code },
        update: { name: service.name, active: true },
        create: service,
      }),
    ),
  );

  await Promise.all(
    PROVIDERS.map((provider) =>
      prisma.provider.upsert({
        where: { code: provider.code },
        update: {
          name: provider.name,
          monthlyQuota: provider.monthlyQuota,
          active: true,
        },
        create: provider,
      }),
    ),
  );

  const [services, providers] = await Promise.all([
    prisma.service.findMany({
      where: { code: { in: SERVICES.map((service) => service.code) } },
      select: { id: true, code: true },
    }),
    prisma.provider.findMany({
      where: { code: { in: PROVIDERS.map((provider) => provider.code) } },
      select: { id: true, code: true },
    }),
  ]);

  const serviceIdByCode = new Map(services.map((service) => [service.code, service.id]));
  const providerIdByCode = new Map(providers.map((provider) => [provider.code, provider.id]));
  const serviceProviderRules: Prisma.ServiceProviderRuleCreateManyInput[] = [];

  for (const service of SERVICES) {
    const serviceId = serviceIdByCode.get(service.code);
    if (!serviceId) {
      throw new Error(`Missing seeded service ${service.code}`);
    }

    const rule = SERVICE_DISTRIBUTION_RULES[service.code];
    const desiredRules = [
      ...rule.mandatory.map((providerCode, position) => ({
        providerCode,
        role: ServiceProviderRole.MANDATORY,
        position,
      })),
      ...rule.fairPool.map((providerCode, position) => ({
        providerCode,
        role: ServiceProviderRole.FAIR_POOL,
        position,
      })),
    ];

    for (const { providerCode, role, position } of desiredRules) {
      const providerId = providerIdByCode.get(providerCode as ProviderCode);
      if (!providerId) {
        throw new Error(`Missing seeded provider ${providerCode}`);
      }

      serviceProviderRules.push({
        serviceId,
        providerId,
        role,
        position,
      });
    }
  }

  await prisma.serviceProviderRule.deleteMany({
    where: { serviceId: { in: services.map((service) => service.id) } },
  });

  await prisma.serviceProviderRule.createMany({
    data: serviceProviderRules,
  });

  await prisma.roundRobinCursor.createMany({
    data: services.map((service) => ({ serviceId: service.id, nextPosition: 0 })),
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
