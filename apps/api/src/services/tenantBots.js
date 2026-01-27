/**
 * Service: Tenant Bot Management
 * Consulta y gestiona los bots asignados a un tenant desde el control plane
 */
const { getControlClient } = require("../control/controlClient");
const { getFlow } = require("../../flows");

/**
 * Obtiene el flow activo para un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Object|null} - Flow activo o null si no hay ninguno activo
 */
async function getActiveTenantFlow(tenantId) {
    if (!tenantId) {
        return null;
    }

    const control = getControlClient();

    // Buscar el primer bot activo del tenant
    const tenantBot = await control.tenantBot.findFirst({
        where: {
            tenant_id: tenantId,
            is_active: true,
        },
        orderBy: {
            created_at: "asc", // El más antiguo primero (flow principal)
        },
    });

    if (!tenantBot) {
        return null;
    }

    // Cargar el flow desde la carpeta flows/
    const flow = getFlow(tenantBot.flow_id);
    if (!flow) {
        console.warn(`Flow ${tenantBot.flow_id} not found for tenant ${tenantId}`);
        return null;
    }

    return {
        tenantBotId: tenantBot.id,
        flowId: tenantBot.flow_id,
        config: tenantBot.config,
        flow,
    };
}

/**
 * Obtiene todos los bots de un tenant con sus flows
 * @param {string} tenantId - ID del tenant
 * @returns {Array} - Lista de bots con metadata de flow
 */
async function getTenantBots(tenantId) {
    if (!tenantId) {
        return [];
    }

    const control = getControlClient();

    const tenantBots = await control.tenantBot.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: "asc" },
    });

    return tenantBots.map((tb) => {
        const flow = getFlow(tb.flow_id);
        return {
            id: tb.id,
            flow_id: tb.flow_id,
            is_active: tb.is_active,
            config: tb.config,
            created_at: tb.created_at,
            updated_at: tb.updated_at,
            flow_name: flow?.name || tb.flow_id,
            flow_description: flow?.description || "",
            flow_icon: flow?.icon || "🤖",
        };
    });
}

/**
 * Actualiza el estado de un bot para un tenant
 * @param {string} tenantBotId - ID del TenantBot
 * @param {boolean} isActive - Nuevo estado
 */
async function updateTenantBotStatus(tenantBotId, isActive) {
    const control = getControlClient();

    return control.tenantBot.update({
        where: { id: tenantBotId },
        data: { is_active: isActive },
    });
}

module.exports = {
    getActiveTenantFlow,
    getTenantBots,
    updateTenantBotStatus,
};
