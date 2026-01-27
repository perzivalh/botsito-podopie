-- CreateTable
CREATE TABLE "TenantBot" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantBot_tenant_id_idx" ON "TenantBot"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBot_tenant_id_flow_id_key" ON "TenantBot"("tenant_id", "flow_id");

-- AddForeignKey
ALTER TABLE "TenantBot" ADD CONSTRAINT "TenantBot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
