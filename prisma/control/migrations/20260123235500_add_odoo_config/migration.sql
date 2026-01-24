CREATE TABLE "OdooConfig" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "db_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_encrypted" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdooConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OdooConfig_tenant_id_key" ON "OdooConfig"("tenant_id");

ALTER TABLE "OdooConfig" ADD CONSTRAINT "OdooConfig_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
