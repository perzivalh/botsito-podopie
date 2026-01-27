/**
 * BotSection (Super Admin)
 * Solo permite asignar o quitar bots a un tenant.
 * La gestión fina (activo/inactivo, métricas) la hace el cliente.
 */
import React, { useState } from "react";

function BotSection({
    tenantId,
    tenantBots,
    availableFlows,
    loading,
    onAddBot,
    onRemoveBot,
}) {
    const [selectedFlow, setSelectedFlow] = useState("");

    const usedFlowIds = new Set(tenantBots.map((tb) => tb.flow_id));
    const unusedFlows = availableFlows.filter((f) => !usedFlowIds.has(f.id));

    function handleAdd() {
        if (!selectedFlow) return;
        onAddBot(selectedFlow);
        setSelectedFlow("");
    }

    return (
        <div className="sa-bot-card">
            <div className="sa-bot-header">
                <div className="sa-bot-icon-large">
                    🤖
                </div>
                <div className="sa-bot-title-group">
                    <h3>Asignación de Bots</h3>
                    <p>Selecciona qué flujos estarán disponibles para este cliente. Los flujos asignados aparecerán inmediatamente en el panel del usuario.</p>
                </div>
            </div>

            {loading ? (
                <div className="sa-loading" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                    Cargando asignaciones...
                </div>
            ) : tenantBots.length === 0 ? (
                <div className="sa-empty-placeholder">
                    <div className="sa-empty-icon">📂</div>
                    <div>Este cliente no tiene bots asignados actualmente.</div>
                </div>
            ) : (
                <div className="sa-bot-grid">
                    {tenantBots.map((bot) => (
                        <div key={bot.id} className="sa-assigned-bot">
                            <div className="sa-bot-item-icon">
                                {bot.flow_icon || "⚡"}
                            </div>
                            <div className="sa-bot-item-info">
                                <span className="sa-bot-item-name">
                                    {bot.flow_name || bot.flow_id}
                                </span>
                                <span className="sa-bot-item-desc">
                                    {bot.flow_description || "Sin descripción"}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="sa-btn-remove"
                                title="Quitar bot del cliente"
                                onClick={() => onRemoveBot(bot.id)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="sa-bot-controls">
                <div className="sa-select-container">
                    <select
                        className="sa-select-styled"
                        value={selectedFlow}
                        onChange={(e) => setSelectedFlow(e.target.value)}
                        disabled={unusedFlows.length === 0}
                    >
                        <option value="">
                            {unusedFlows.length === 0
                                ? "-- No hay más bots disponibles --"
                                : "-- Seleccionar bot para asignar --"}
                        </option>
                        {unusedFlows.map((flow) => (
                            <option key={flow.id} value={flow.id}>
                                {flow.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    className="sa-btn-assign"
                    onClick={handleAdd}
                    disabled={!selectedFlow}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    Asignar Bot
                </button>
            </div>
        </div>
    );
}

export default BotSection;
