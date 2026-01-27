/**
 * BotSection - Gestión de Bots para el Tenant
 * Muestra los bots asignados por el SuperAdmin con opción de activar/desactivar
 */
import React, { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../api";

function BotSection({ settings, setSettings, handleSaveSettings }) {
    const [bots, setBots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadBots();
    }, []);

    async function loadBots() {
        setLoading(true);
        try {
            const response = await apiGet("/api/admin/bots");
            setBots(response.bots || []);
            setError("");
        } catch (err) {
            setError(err.message || "Error al cargar bots");
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleBot(botId, newActive) {
        try {
            await apiPatch(`/api/admin/bots/${botId}`, { is_active: newActive });
            setBots((prev) =>
                prev.map((b) => (b.id === botId ? { ...b, is_active: newActive } : b))
            );
        } catch (err) {
            setError(err.message || "Error al cambiar estado");
        }
    }

    const activeBots = bots.filter((b) => b.is_active).length;
    const globalActive = activeBots > 0 && settings?.bot_enabled;

    const formatLastActivity = (date) => {
        if (!date) return "Sin actividad reciente";
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Hace un momento";
        if (diffMins < 60) return `Última actividad: hace ${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Última actividad: hace ${diffHours}h`;
        return `Última actividad: ${d.toLocaleDateString()}`;
    };

    return (
        <div className="bot-section">
            {/* Header */}
            <div className="bot-section-header">
                <div className="bot-section-title-area">
                    <div className="bot-section-icon">🤖</div>
                    <div>
                        <h2 className="bot-section-title">Gestión de Bots</h2>
                        <p className="bot-section-subtitle">
                            Administra los flujos automatizados y el rendimiento técnico.
                        </p>
                    </div>
                </div>
                <div className="bot-section-global-toggle">
                    <span className="bot-toggle-label">ESTADO DEL BOT:</span>
                    <div className={`bot-toggle-pill ${globalActive ? "active" : "inactive"}`}>
                        <span className="bot-toggle-dot" />
                        <span>{globalActive ? "ACTIVO" : "INACTIVO"}</span>
                    </div>
                </div>
            </div>

            {error && <div className="bot-error">{error}</div>}

            <div className="bot-section-content">
                {/* Panel izquierdo: Monitoreo de Flujos */}
                <div className="bot-flows-panel">
                    <div className="bot-panel-header">
                        <span className="bot-panel-title">MONITOREO DE FLUJOS</span>
                    </div>

                    {loading ? (
                        <div className="bot-loading">Cargando bots...</div>
                    ) : bots.length === 0 ? (
                        <div className="bot-empty">
                            <p>No hay bots asignados a tu cuenta.</p>
                            <p className="bot-empty-hint">Contacta al administrador para habilitar bots.</p>
                        </div>
                    ) : (
                        <div className="bot-flows-list">
                            {bots.map((bot) => (
                                <div key={bot.id} className="bot-flow-card">
                                    <div className="bot-flow-info">
                                        <span className="bot-flow-icon">{bot.flow_icon || "🤖"}</span>
                                        <div>
                                            <div className="bot-flow-name">{bot.flow_name}</div>
                                            <div className={`bot-flow-status ${bot.is_active ? "active" : "inactive"}`}>
                                                ● {bot.is_active ? "ACTIVO" : "INACTIVO"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bot-flow-actions">
                                        <label className="bot-toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={bot.is_active}
                                                onChange={() => handleToggleBot(bot.id, !bot.is_active)}
                                            />
                                            <span className="bot-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="bot-flow-meta">
                                        {formatLastActivity(bot.updated_at)}
                                    </div>
                                    {bot.flow_description && (
                                        <div className="bot-flow-desc">{bot.flow_description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Panel derecho: Métricas */}
                <div className="bot-metrics-panel">
                    <div className="bot-panel-header">
                        <span className="bot-panel-title">MÉTRICAS DE EFICACIA DETALLADAS</span>
                    </div>

                    <div className="bot-metrics-grid">
                        {/* Interacciones */}
                        <div className="bot-metric-card">
                            <div className="bot-metric-icon">📊</div>
                            <div className="bot-metric-badge positive">+12% vs ayer</div>
                            <div className="bot-metric-label">INTERACCIONES</div>
                            <div className="bot-metric-value">--</div>
                            <div className="bot-metric-sub">Total de sesiones iniciadas hoy</div>
                        </div>

                        {/* Resolución Final */}
                        <div className="bot-metric-card">
                            <div className="bot-metric-icon">✓</div>
                            <div className="bot-metric-badge neutral">Objetivo: 85%</div>
                            <div className="bot-metric-label">RESOLUCIÓN FINAL</div>
                            <div className="bot-metric-value">--%</div>
                            <div className="bot-metric-progress">
                                <div className="bot-metric-progress-fill" style={{ width: "0%" }} />
                            </div>
                        </div>

                        {/* Vida del Proceso */}
                        <div className="bot-metric-card">
                            <div className="bot-metric-icon">⏱</div>
                            <div className="bot-metric-badge sla">● SLA Normal</div>
                            <div className="bot-metric-label">VIDA DEL PROCESO</div>
                            <div className="bot-metric-value">--</div>
                            <div className="bot-metric-sub">UPTIME: --%</div>
                        </div>

                        {/* Errores */}
                        <div className="bot-metric-card">
                            <div className="bot-metric-icon error">⚠</div>
                            <div className="bot-metric-badge stable">Estable</div>
                            <div className="bot-metric-label">ERRORES</div>
                            <div className="bot-metric-value">--</div>
                            <div className="bot-metric-sub error-sub">CRÍTICOS: 0</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings originales (bot_enabled, auto_reply_enabled) */}
            <div className="bot-global-settings">
                <div className="bot-panel-header">
                    <span className="bot-panel-title">CONFIGURACIÓN GLOBAL</span>
                </div>
                {settings ? (
                    <div className="bot-settings-controls">
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.bot_enabled}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        bot_enabled: event.target.checked,
                                    }))
                                }
                            />
                            Bot habilitado
                        </label>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.auto_reply_enabled}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        auto_reply_enabled: event.target.checked,
                                    }))
                                }
                            />
                            Auto respuesta habilitada
                        </label>
                        <button className="primary" onClick={handleSaveSettings}>
                            Guardar configuración
                        </button>
                    </div>
                ) : (
                    <div className="bot-loading">Cargando settings...</div>
                )}
            </div>
        </div>
    );
}

export default BotSection;
