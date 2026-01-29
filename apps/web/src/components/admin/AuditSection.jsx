/**
 * AuditSection - Registros de auditoria
 */
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api";

const MODULE_ICONS = {
  campaigns: "🎯",
  users: "👤",
  bot: "🤖",
  chat: "💬",
  templates: "🧩",
  audience: "🧑‍🤝‍🧑",
  system: "⚙️",
};

const ACTION_LABELS = {
  "user.created": "USUARIO CREADO",
  "user.updated": "USUARIO EDITADO",
  "user.disabled": "USUARIO ELIMINADO",
  "template_draft_created": "PLANTILLA CREADA",
  "template_draft_updated": "PLANTILLA EDITADA",
  "template_submitted": "PLANTILLA ENVIADA",
  "template_deleted": "PLANTILLA ELIMINADA",
  "template_restored": "PLANTILLA RESTAURADA",
  "audience_created": "SEGMENTO CREADO",
  "audience_updated": "SEGMENTO EDITADO",
  "audience_deleted": "SEGMENTO ELIMINADO",
  "campaign.created": "CAMPAÑA CREADA",
  "campaign.queued": "CAMPAÑA EN COLA",
  "campaign.sending": "CAMPAÑA LANZADA",
  "settings.updated": "CONFIG ACTUALIZADA",
  "role_permissions.updated": "PERMISOS CAMBIADOS",
  "role_permissions.deleted": "ROL ELIMINADO",
  "conversation.status_changed": "CHAT ACTUALIZADO",
  "conversation.tag_added": "TAG AGREGADO",
  "conversation.tag_removed": "TAG ELIMINADO",
};

function getModuleFromLog(log) {
  const entity = log?.data_json?.entity || "";
  if (entity === "template") return "templates";
  if (entity === "audience") return "audience";
  if (entity === "campaign") return "campaigns";
  if (entity === "conversation") return "chat";
  const action = log?.action || "";
  if (action.includes("user")) return "users";
  if (action.includes("campaign")) return "campaigns";
  if (action.includes("template")) return "templates";
  if (action.includes("audience")) return "audience";
  if (action.includes("bot")) return "bot";
  if (action.includes("conversation")) return "chat";
  return "system";
}

function formatTimestamp(value) {
  if (!value) {
    return { date: "--", time: "--" };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "--", time: "--" };
  }
  return {
    date: parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function exportCsv(rows) {
  const header = ["timestamp", "usuario", "email", "accion", "modulo", "data"];
  const lines = [header.join(",")];
  rows.forEach((log) => {
    const user = log.user?.name || "Sistema";
    const email = log.user?.email || "";
    const moduleKey = getModuleFromLog(log);
    const row = [
      new Date(log.created_at).toISOString(),
      user,
      email,
      log.action,
      moduleKey,
      JSON.stringify(log.data_json || {}),
    ];
    lines.push(row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "audit_logs.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function AuditSection() {
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchLogs = async ({ pageOverride } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageOverride || page));
      params.set("page_size", String(pageSize));
      if (query.trim()) params.set("q", query.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const data = await apiGet(`/api/admin/audit?${params.toString()}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    fetchLogs({ pageOverride: 1 });
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "1000");
    if (query.trim()) params.set("q", query.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const data = await apiGet(`/api/admin/audit?${params.toString()}`);
    exportCsv(data.logs || []);
  };

  const pagination = useMemo(() => {
    const pages = [];
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages, start + 2);
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="audit-module">
      <div className="audit-header">
        <div>
          <div className="audit-title">Registros / Auditoria</div>
          <div className="audit-subtitle">
            Monitorea acciones de usuarios y eventos del sistema
          </div>
        </div>
        <button className="audit-export" type="button" onClick={handleExport}>
          ⭳ Exportar CSV/Excel
        </button>
      </div>

      <div className="audit-filters">
        <div className="audit-search">
          <span className="audit-search-icon" />
          <input
            type="text"
            placeholder="Filtrar por usuario o accion.."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="audit-date">
          <span>Desde</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div className="audit-date">
          <span>Hasta</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
        <button className="audit-filter-btn" type="button" onClick={handleFilter}>
          Filtrar
        </button>
      </div>

      <div className="audit-card">
        <div className="audit-table-head">
          <span>Timestamp</span>
          <span>Usuario</span>
          <span>Accion</span>
          <span>Modulo</span>
        </div>
        {loading && <div className="audit-empty">Cargando registros...</div>}
        {!loading && !logs.length && (
          <div className="audit-empty">Sin registros para mostrar</div>
        )}
        {!loading &&
          logs.map((log) => {
            const timestamp = formatTimestamp(log.created_at);
            const moduleKey = getModuleFromLog(log);
            const actionLabel = ACTION_LABELS[log.action] || log.action;
            const userName = log.user?.name || "System Bot";
            const userEmail = log.user?.email || "automated@service";
            return (
              <button
                key={log.id}
                type="button"
                className="audit-row"
                onClick={() => setSelectedLog(log)}
              >
                <div className="audit-cell time">
                  <div>{timestamp.date}</div>
                  <div className="audit-time">{timestamp.time}</div>
                </div>
                <div className="audit-cell user">
                  <div className="audit-avatar">{userName?.[0] || "S"}</div>
                  <div>
                    <div className="audit-user-name">{userName}</div>
                    <div className="audit-user-email">{userEmail}</div>
                  </div>
                </div>
                <div className="audit-cell action">
                  <span className="audit-action-pill">{actionLabel}</span>
                </div>
                <div className="audit-cell module">
                  <span className="audit-module-icon">
                    {MODULE_ICONS[moduleKey] || MODULE_ICONS.system}
                  </span>
                  {moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)}
                </div>
              </button>
            );
          })}
      </div>

      <div className="audit-footer">
        <div>
          Mostrando {logs.length} de {total} registros
        </div>
        <div className="audit-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            ‹
          </button>
          {pagination.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={pageNumber === page ? "active" : ""}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            ›
          </button>
        </div>
      </div>

      {selectedLog && (
        <div className="audit-modal">
          <div className="audit-modal-card">
            <div className="audit-modal-header">
              <div>
                <div className="audit-modal-title">Detalle del registro</div>
                <div className="audit-modal-subtitle">{selectedLog.action}</div>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className="audit-modal-body">
              <div className="audit-detail">
                <span>Usuario</span>
                <strong>{selectedLog.user?.name || "System Bot"}</strong>
                <small>{selectedLog.user?.email || "automated@service"}</small>
              </div>
              <div className="audit-detail">
                <span>Timestamp</span>
                <strong>{formatTimestamp(selectedLog.created_at).date}</strong>
                <small>{formatTimestamp(selectedLog.created_at).time}</small>
              </div>
              <div className="audit-detail full">
                <span>Data</span>
                <pre>{JSON.stringify(selectedLog.data_json || {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditSection;
