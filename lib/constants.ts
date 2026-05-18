export const MONTHLY_PROVIDER_QUOTA = 10;
export const ASSIGNMENTS_PER_LEAD = 3;

export const SERVICES = [
  { code: "SERVICE_1", name: "Service 1" },
  { code: "SERVICE_2", name: "Service 2" },
  { code: "SERVICE_3", name: "Service 3" },
] as const;

export const PROVIDERS = [
  { code: "PROVIDER_1", name: "Provider 1", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_2", name: "Provider 2", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_3", name: "Provider 3", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_4", name: "Provider 4", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_5", name: "Provider 5", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_6", name: "Provider 6", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_7", name: "Provider 7", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
  { code: "PROVIDER_8", name: "Provider 8", monthlyQuota: MONTHLY_PROVIDER_QUOTA },
] as const;

export const SERVICE_DISTRIBUTION_RULES = {
  SERVICE_1: {
    mandatory: ["PROVIDER_1"],
    fairPool: ["PROVIDER_2", "PROVIDER_3", "PROVIDER_4"],
  },
  SERVICE_2: {
    mandatory: ["PROVIDER_5"],
    fairPool: ["PROVIDER_6", "PROVIDER_7", "PROVIDER_8"],
  },
  SERVICE_3: {
    mandatory: ["PROVIDER_1", "PROVIDER_4"],
    fairPool: [
      "PROVIDER_2",
      "PROVIDER_3",
      "PROVIDER_5",
      "PROVIDER_6",
      "PROVIDER_7",
      "PROVIDER_8",
    ],
  },
} as const satisfies Record<
  (typeof SERVICES)[number]["code"],
  {
    mandatory: readonly string[];
    fairPool: readonly string[];
  }
>;

export type ServiceCode = keyof typeof SERVICE_DISTRIBUTION_RULES;
export type ProviderCode = (typeof PROVIDERS)[number]["code"];

export function requiredFairAssignments(serviceCode: ServiceCode): number {
  return ASSIGNMENTS_PER_LEAD - SERVICE_DISTRIBUTION_RULES[serviceCode].mandatory.length;
}

for (const [serviceCode, rule] of Object.entries(SERVICE_DISTRIBUTION_RULES)) {
  const uniqueProviders = new Set([...rule.mandatory, ...rule.fairPool]);
  const requiredFairCount = ASSIGNMENTS_PER_LEAD - rule.mandatory.length;

  if (requiredFairCount < 0) {
    throw new Error(`${serviceCode} has more mandatory providers than assignment slots.`);
  }

  if (rule.fairPool.length < requiredFairCount) {
    throw new Error(`${serviceCode} does not have enough fair-pool providers.`);
  }

  if (uniqueProviders.size !== rule.mandatory.length + rule.fairPool.length) {
    throw new Error(`${serviceCode} contains duplicate providers across its rules.`);
  }
}
