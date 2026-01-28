/**
 * BotSection (Super Admin)
 * Solo permite asignar o quitar bots a un tenant.
 */
import React, { useState } from "react";

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="5" y="7" width="14" height="10" rx="2" strokeWidth="1.8" />
      <circle cx="9" cy="12" r="1" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="1" strokeWidth="1.8" />
      <line x1="12" y1="4" x2="12" y2="7" strokeWidth="1.8" />
    </svg>
  );
}

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
  const unusedFlows = availableFlows.filter((flow) => !usedFlowIds.has(flow.id));

  function handleAdd() {
    if (!selectedFlow) {
      return;
    }
    onAddBot(selectedFlow);
    setSelectedFlow("");
  }

  return (
    <section className="sa-bot-card" data-tenant={tenantId || ""}>
      <header className="sa-bot-header">
        <div className="sa-bot-icon-large" aria-hidden="true">
          <BotIcon />
        </div>
        <div className="sa-bot-title-group">
          <h3>Asignacion de Bots</h3>
          <p>
            Selecciona que flujos estaran disponibles para este cliente. Los
            flujos asignados apareceran inmediatamente en el panel del usuario.
          </p>
        </div>
      </header>

      <div className="sa-bot-body">
        {loading ? (
          <div className="sa-bot-loading">Cargando asignaciones...</div>
        ) : tenantBots.length === 0 ? (
          <div className="sa-bot-empty">
            <div className="sa-bot-empty-icon">+</div>
            <div className="sa-bot-empty-title">Sin bots asignados</div>
            <div className="sa-bot-empty-sub">
              Agrega un flujo desde el selector para activarlo en este tenant.
            </div>
          </div>
        ) : (
          <div className="sa-bot-grid">
            {tenantBots.map((bot) => (
              <div key={bot.id} className="sa-assigned-bot">
                <div className="sa-bot-item-icon">
                  {bot.flow_icon || ">"}
                </div>
                <div className="sa-bot-item-info">
                  <span className="sa-bot-item-name">
                    {bot.flow_name || bot.flow_id}
                  </span>
                  <span className="sa-bot-item-desc">
                    {bot.flow_description || "Sin descripcion"}
                  </span>
                </div>
                <button
                  type="button"
                  className="sa-btn-remove"
                  title="Quitar bot del cliente"
                  onClick={() => onRemoveBot(bot.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sa-bot-controls">
        <div className="sa-select-container">
          <label className="sa-select-label">Asignar bot</label>
          <select
            className="sa-select-styled"
            value={selectedFlow}
            onChange={(event) => setSelectedFlow(event.target.value)}
            disabled={unusedFlows.length === 0}
          >
            <option value="">
              {unusedFlows.length === 0
                ? "No hay mas bots disponibles"
                : "Selecciona un bot para asignar"}
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
          Asignar Bot
        </button>
      </div>
    </section>
  );
}

export default BotSection;
