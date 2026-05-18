-- CreateEnum
CREATE TYPE "ServiceProviderRole" AS ENUM ('MANDATORY', 'FAIR_POOL');

-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('MANDATORY', 'FAIR_POOL');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "DashboardEventType" AS ENUM ('LEAD_CREATED', 'LEAD_ASSIGNED', 'QUOTA_UPDATED');

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyQuota" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_rules" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "role" "ServiceProviderRole" NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_provider_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_robin_cursors" (
    "serviceId" INTEGER NOT NULL,
    "nextPosition" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "round_robin_cursors_pkey" PRIMARY KEY ("serviceId")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "source" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_assignments" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "providerId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "kind" "AssignmentKind" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_monthly_usages" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "monthStart" DATE NOT NULL,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_monthly_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_events" (
    "id" BIGSERIAL NOT NULL,
    "type" "DashboardEventType" NOT NULL,
    "leadId" UUID,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE INDEX "service_provider_rules_serviceId_role_position_idx" ON "service_provider_rules"("serviceId", "role", "position");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_rules_serviceId_providerId_key" ON "service_provider_rules"("serviceId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_rules_serviceId_role_position_key" ON "service_provider_rules"("serviceId", "role", "position");

-- CreateIndex
CREATE INDEX "leads_serviceId_createdAt_idx" ON "leads"("serviceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "leads_phone_serviceId_key" ON "leads"("phone", "serviceId");

-- CreateIndex
CREATE INDEX "lead_assignments_providerId_assignedAt_idx" ON "lead_assignments"("providerId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lead_assignments_leadId_providerId_key" ON "lead_assignments"("leadId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_assignments_leadId_slot_key" ON "lead_assignments"("leadId", "slot");

-- CreateIndex
CREATE INDEX "provider_monthly_usages_monthStart_assignedCount_idx" ON "provider_monthly_usages"("monthStart", "assignedCount");

-- CreateIndex
CREATE UNIQUE INDEX "provider_monthly_usages_providerId_monthStart_key" ON "provider_monthly_usages"("providerId", "monthStart");

-- CreateIndex
CREATE INDEX "webhook_events_status_receivedAt_idx" ON "webhook_events"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_source_externalEventId_key" ON "webhook_events"("source", "externalEventId");

-- CreateIndex
CREATE INDEX "dashboard_events_createdAt_idx" ON "dashboard_events"("createdAt");

-- CreateIndex
CREATE INDEX "dashboard_events_leadId_createdAt_idx" ON "dashboard_events"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "service_provider_rules" ADD CONSTRAINT "service_provider_rules_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_rules" ADD CONSTRAINT "service_provider_rules_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_robin_cursors" ADD CONSTRAINT "round_robin_cursors_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_monthly_usages" ADD CONSTRAINT "provider_monthly_usages_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_events" ADD CONSTRAINT "dashboard_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
