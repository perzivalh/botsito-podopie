
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../api";

const MODULES = [
  { id: "overview", label: "Overview", hint: "Control" },
  { id: "tenants", label: "Tenants", hint: "Alta y DB" },
  { id: "channels", label: "Canales", hint: "WhatsApp" },
  { id: "branding", label: "Branding", hint: "Marca" },
  { id: "odoo", label: "Odoo", hint: "ERP" },
];

const EMPTY_PROVISION = {
  name: "",
  slug: "",
  plan: "",
  db_url: "",
  phone_number_id: "",
  waba_id: "",
  verify_token: "",
  wa_token: "",
  app_secret: "",
  brand_name: "",
  logo_url: "",
  timezone: "",
  odoo_base_url: "",
  odoo_db_name: "",
  odoo_username: "",
  odoo_password: "",
};

function SuperAdminView() {
  const [activeModule, setActiveModule] = useState("overview");
  const [tenants, setTenants] = useState([]);
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [provisionForm, setProvisionForm] = useState(EMPTY_PROVISION);
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [tenantUpdateForm, setTenantUpdateForm] = useState({
    tenant_id: "",
    name: "",
    slug: "",
    plan: "",
    is_active: true,
  });
  const [dbForm, setDbForm] = useState({
    tenant_id: "",
    db_url: "",
  });
  const [channelForm, setChannelForm] = useState({
    tenant_id: "",
    phone_number_id: "",
    waba_id: "",
    verify_token: "",
    wa_token: "",
    app_secret: "",
  });
  const [channelUpdateForm, setChannelUpdateForm] = useState({
    channel_id: "",
    phone_number_id: "",
    waba_id: "",
    verify_token: "",
    wa_token: "",
    app_secret: "",
  });
  const [brandingForm, setBrandingForm] = useState({
    tenant_id: "",
    brand_name: "",
    logo_url: "",
    colors: "",
    timezone: "",
  });
  const [odooForm, setOdooForm] = useState({
    tenant_id: "",
    base_url: "",
    db_name: "",
    username: "",
    password: "",
  });

  const provisionRef = useRef(null);
  const manageRef = useRef(null);

  async function loadData() {
    try {
      const tenantResponse = await apiGet("/api/superadmin/tenants");
      setTenants(tenantResponse.tenants || []);
      const channelResponse = await apiGet("/api/superadmin/channels");
      setChannels(channelResponse.channels || []);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudo cargar datos.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);
  const channelsByTenant = useMemo(() => {
    const map = new Map();
    channels.forEach((channel) => {
      const count = map.get(channel.tenant_id) || 0;
      map.set(channel.tenant_id, count + 1);
    });
    return map;
  }, [channels]);

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    const list = tenants.slice();
    if (!query) {
      return list;
    }
    return list.filter((tenant) => {
      const name = String(tenant.name || "").toLowerCase();
      const slug = String(tenant.slug || "").toLowerCase();
      const id = String(tenant.id || "").toLowerCase();
      return name.includes(query) || slug.includes(query) || id.includes(query);
    });
  }, [tenants, tenantSearch]);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tenant) => tenant.is_active).length;
  const dbReadyTenants = tenants.filter((tenant) => tenant.has_database).length;
  const odooReadyTenants = tenants.filter((tenant) => tenant.has_odoo).length;
  const totalChannels = channels.length;

  function formatDateShort(value) {
    if (!value) {
      return "n/a";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "n/a";
    }
    return parsed.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  function formatPercent(numerator, denominator) {
    if (!denominator) {
      return "0%";
    }
    return `${Math.round((numerator / denominator) * 100)}%`;
  }

  function handleQuickNewTenant() {
    setActiveModule("tenants");
    requestAnimationFrame(() => {
      provisionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleFocusTenant(tenant) {
    setActiveModule("tenants");
    setTenantUpdateForm({
      tenant_id: tenant.id,
      name: tenant.name || "",
      slug: tenant.slug || "",
      plan: tenant.plan || "",
      is_active: tenant.is_active,
    });
    setDbForm((prev) => ({ ...prev, tenant_id: tenant.id }));
    setBrandingForm((prev) => ({ ...prev, tenant_id: tenant.id }));
    setChannelForm((prev) => ({ ...prev, tenant_id: tenant.id }));
    loadOdooConfig(tenant.id);
    requestAnimationFrame(() => {
      manageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  async function handleProvisionTenant(event) {
    event.preventDefault();
    const name = provisionForm.name.trim();
    const slug = provisionForm.slug.trim();
    const plan = provisionForm.plan.trim();

    if (!name || !slug) {
      setError("Nombre y slug son requeridos.");
      return;
    }

    const wantsChannel =
      provisionForm.phone_number_id ||
      provisionForm.wa_token ||
      provisionForm.verify_token ||
      provisionForm.waba_id ||
      provisionForm.app_secret;

    if (
      wantsChannel &&
      (!provisionForm.phone_number_id ||
        !provisionForm.verify_token ||
        !provisionForm.wa_token)
    ) {
      setError("Canal incompleto: phone_number_id, verify_token y wa_token.");
      return;
    }

    const wantsOdoo =
      provisionForm.odoo_base_url ||
      provisionForm.odoo_db_name ||
      provisionForm.odoo_username ||
      provisionForm.odoo_password;

    if (
      wantsOdoo &&
      (!provisionForm.odoo_base_url ||
        !provisionForm.odoo_db_name ||
        !provisionForm.odoo_username ||
        !provisionForm.odoo_password)
    ) {
      setError("Odoo incompleto: base_url, db_name, username, password.");
      return;
    }

    try {
      setProvisionBusy(true);
      setError("");
      const result = await apiPost("/api/superadmin/tenants", {
        name,
        slug,
        plan,
      });
      const tenantId = result.tenant?.id;
      if (!tenantId) {
        throw new Error("tenant_not_created");
      }

      if (provisionForm.db_url.trim()) {
        await apiPost(`/api/superadmin/tenants/${tenantId}/database`, {
          db_url: provisionForm.db_url.trim(),
        });
      }

      if (wantsChannel) {
        await apiPost("/api/superadmin/channels", {
          tenant_id: tenantId,
          phone_number_id: provisionForm.phone_number_id.trim(),
          waba_id: provisionForm.waba_id.trim(),
          verify_token: provisionForm.verify_token.trim(),
          wa_token: provisionForm.wa_token.trim(),
          app_secret: provisionForm.app_secret.trim(),
        });
      }

      const wantsBranding =
        provisionForm.brand_name.trim() ||
        provisionForm.logo_url.trim() ||
        provisionForm.timezone.trim();

      if (wantsBranding) {
        await apiPatch("/api/superadmin/branding", {
          tenant_id: tenantId,
          brand_name: provisionForm.brand_name.trim(),
          logo_url: provisionForm.logo_url.trim() || null,
          colors: null,
          timezone: provisionForm.timezone.trim() || null,
        });
      }

      if (wantsOdoo) {
        await apiPatch("/api/superadmin/odoo", {
          tenant_id: tenantId,
          base_url: provisionForm.odoo_base_url.trim(),
          db_name: provisionForm.odoo_db_name.trim(),
          username: provisionForm.odoo_username.trim(),
          password: provisionForm.odoo_password.trim(),
        });
      }

      setProvisionForm(EMPTY_PROVISION);
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo provisionar tenant.");
    } finally {
      setProvisionBusy(false);
    }
  }
  function handleTenantSelect(value) {
    const selected = tenants.find((tenant) => tenant.id === value);
    if (!selected) {
      setTenantUpdateForm({
        tenant_id: "",
        name: "",
        slug: "",
        plan: "",
        is_active: true,
      });
      return;
    }
    setTenantUpdateForm({
      tenant_id: selected.id,
      name: selected.name || "",
      slug: selected.slug || "",
      plan: selected.plan || "",
      is_active: selected.is_active,
    });
  }

  async function handleUpdateTenant(event) {
    event.preventDefault();
    if (!tenantUpdateForm.tenant_id) {
      setError("Selecciona un tenant.");
      return;
    }
    try {
      await apiPatch(`/api/superadmin/tenants/${tenantUpdateForm.tenant_id}`, {
        name: tenantUpdateForm.name,
        slug: tenantUpdateForm.slug,
        plan: tenantUpdateForm.plan,
        is_active: tenantUpdateForm.is_active,
      });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo actualizar tenant.");
    }
  }

  async function handleSetDb(event) {
    event.preventDefault();
    if (!dbForm.tenant_id) {
      setError("Selecciona un tenant.");
      return;
    }
    try {
      await apiPost(`/api/superadmin/tenants/${dbForm.tenant_id}/database`, {
        db_url: dbForm.db_url,
      });
      setDbForm({ tenant_id: dbForm.tenant_id, db_url: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo guardar DB.");
    }
  }

  async function handleCreateChannel(event) {
    event.preventDefault();
    try {
      await apiPost("/api/superadmin/channels", channelForm);
      setChannelForm({
        tenant_id: channelForm.tenant_id,
        phone_number_id: "",
        waba_id: "",
        verify_token: "",
        wa_token: "",
        app_secret: "",
      });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo crear canal.");
    }
  }

  function handleChannelSelect(value) {
    const selected = channels.find((channel) => channel.id === value);
    if (!selected) {
      setChannelUpdateForm({
        channel_id: "",
        phone_number_id: "",
        waba_id: "",
        verify_token: "",
        wa_token: "",
        app_secret: "",
      });
      return;
    }
    setChannelUpdateForm({
      channel_id: selected.id,
      phone_number_id: selected.phone_number_id || "",
      waba_id: selected.waba_id || "",
      verify_token: "",
      wa_token: "",
      app_secret: "",
    });
  }

  async function handleUpdateChannel(event) {
    event.preventDefault();
    if (!channelUpdateForm.channel_id) {
      setError("Selecciona un canal.");
      return;
    }
    try {
      await apiPatch(`/api/superadmin/channels/${channelUpdateForm.channel_id}`, {
        phone_number_id: channelUpdateForm.phone_number_id,
        waba_id: channelUpdateForm.waba_id,
        verify_token: channelUpdateForm.verify_token || undefined,
        wa_token: channelUpdateForm.wa_token || undefined,
        app_secret: channelUpdateForm.app_secret || undefined,
      });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo actualizar canal.");
    }
  }

  async function handleSaveBranding(event) {
    event.preventDefault();
    if (!brandingForm.tenant_id) {
      setError("Selecciona un tenant.");
      return;
    }
    let colors = null;
    if (brandingForm.colors) {
      try {
        colors = JSON.parse(brandingForm.colors);
      } catch (err) {
        setError("Colors debe ser JSON valido.");
        return;
      }
    }
    try {
      await apiPatch("/api/superadmin/branding", {
        tenant_id: brandingForm.tenant_id,
        brand_name: brandingForm.brand_name,
        logo_url: brandingForm.logo_url || null,
        colors,
        timezone: brandingForm.timezone || null,
      });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo guardar branding.");
    }
  }
  async function loadOdooConfig(tenantId) {
    if (!tenantId) {
      setOdooForm({
        tenant_id: "",
        base_url: "",
        db_name: "",
        username: "",
        password: "",
      });
      return;
    }
    try {
      const response = await apiGet(`/api/superadmin/odoo?tenant_id=${tenantId}`);
      if (response.odoo) {
        setOdooForm({
          tenant_id: tenantId,
          base_url: response.odoo.base_url || "",
          db_name: response.odoo.db_name || "",
          username: response.odoo.username || "",
          password: "",
        });
      } else {
        setOdooForm({
          tenant_id: tenantId,
          base_url: "",
          db_name: "",
          username: "",
          password: "",
        });
      }
      setError("");
    } catch (err) {
      setError(err.message || "No se pudo cargar Odoo.");
    }
  }

  async function handleSaveOdoo(event) {
    event.preventDefault();
    if (!odooForm.tenant_id) {
      setError("Selecciona un tenant.");
      return;
    }
    try {
      const payload = {
        tenant_id: odooForm.tenant_id,
        base_url: odooForm.base_url,
        db_name: odooForm.db_name,
        username: odooForm.username,
      };
      if (odooForm.password) {
        payload.password = odooForm.password;
      }
      await apiPatch("/api/superadmin/odoo", payload);
      setOdooForm({ ...odooForm, password: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo guardar Odoo.");
    }
  }
  return (
    <div className="superadmin-shell">
      <aside className="superadmin-rail">
        <div className="superadmin-logo">PRZV</div>
        <div className="superadmin-nav">
          {MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => setActiveModule(module.id)}
              className={`superadmin-nav-btn ${
                activeModule === module.id ? "active" : ""
              }`}
            >
              <span className="superadmin-nav-icon" />
              <span>{module.label}</span>
              <em>{module.hint}</em>
            </button>
          ))}
        </div>
        <div className="superadmin-rail-footer">
          <div className="superadmin-avatar">SA</div>
          <div>
            <div className="superadmin-role">Superadmin</div>
            <div className="superadmin-meta">Control Plane</div>
          </div>
        </div>
      </aside>

      <section className="superadmin-main">
        <header className="superadmin-header">
          <div>
            <div className="superadmin-kicker">Panel de control Perzivalh</div>
            <div className="superadmin-title">Sistema operativo</div>
            <div className="superadmin-status">
              <span
                className={`superadmin-status-dot ${error ? "warn" : "ok"}`}
              />
              <span>{error ? "modo degradado" : "operativo"}</span>
            </div>
          </div>
          <div className="superadmin-actions">
            <div className="superadmin-version">v0.4 stable</div>
            <button className="sa-button ghost" type="button" onClick={loadData}>
              Recargar
            </button>
            <button className="sa-button primary" type="button" onClick={handleQuickNewTenant}>
              Nuevo tenant
            </button>
          </div>
        </header>

        {error ? <div className="superadmin-alert">{error}</div> : null}

        <div className="superadmin-content">
          {activeModule === "overview" && (
            <div className="superadmin-stack">
              <div className="superadmin-kpis">
                <div className="superadmin-kpi" style={{ "--delay": "0s" }}>
                  <div className="superadmin-kpi-label">Total de tenants</div>
                  <div className="superadmin-kpi-value">{totalTenants}</div>
                  <div className="superadmin-kpi-meta">
                    {activeTenants} activos - {formatPercent(activeTenants, totalTenants)}
                  </div>
                </div>
                <div className="superadmin-kpi" style={{ "--delay": "0.05s" }}>
                  <div className="superadmin-kpi-label">Canales activos</div>
                  <div className="superadmin-kpi-value">{totalChannels}</div>
                  <div className="superadmin-kpi-meta">WhatsApp Cloud</div>
                </div>
                <div className="superadmin-kpi" style={{ "--delay": "0.1s" }}>
                  <div className="superadmin-kpi-label">Tenants con DB</div>
                  <div className="superadmin-kpi-value">{dbReadyTenants}</div>
                  <div className="superadmin-kpi-meta">
                    {formatPercent(dbReadyTenants, totalTenants)} completado
                  </div>
                </div>
                <div className="superadmin-kpi" style={{ "--delay": "0.15s" }}>
                  <div className="superadmin-kpi-label">Odoo conectado</div>
                  <div className="superadmin-kpi-value">{odooReadyTenants}</div>
                  <div className="superadmin-kpi-meta">
                    {formatPercent(odooReadyTenants, totalTenants)} activo
                  </div>
                </div>
              </div>

              <div className="superadmin-panel">
                <div className="superadmin-panel-header">
                  <div>
                    <div className="superadmin-panel-title">Tenants</div>
                    <div className="superadmin-panel-subtitle">
                      Salud general y configuracion
                    </div>
                  </div>
                  <div className="superadmin-panel-actions">
                    <div className="superadmin-search">
                      <span className="superadmin-search-icon" />
                      <input
                        value={tenantSearch}
                        onChange={(event) => setTenantSearch(event.target.value)}
                        placeholder="Filtrar tenants..."
                      />
                    </div>
                  </div>
                </div>
                <div className="superadmin-table">
                  <div className="superadmin-table-head">
                    <div>Referencia</div>
                    <div>Tenant</div>
                    <div>Estado</div>
                    <div>Recursos</div>
                    <div>Creado</div>
                    <div></div>
                  </div>
                  {filteredTenants.length ? (
                    filteredTenants.map((tenant) => (
                      <div key={tenant.id} className="superadmin-table-row">
                        <div className="superadmin-ref">
                          {(tenant.slug || "ref").toUpperCase()}
                        </div>
                        <div>
                          <div className="superadmin-tenant-name">{tenant.name}</div>
                          <div className="superadmin-tenant-meta">
                            {tenant.slug} - {tenant.id.slice(0, 8)}
                          </div>
                        </div>
                        <div className={`superadmin-status-pill ${tenant.is_active ? "ok" : "warn"}`}>
                          <span className="superadmin-status-dot" />
                          {tenant.is_active ? "activo" : "inactivo"}
                        </div>
                        <div className="superadmin-resource">
                          <span className={`superadmin-chip ${tenant.has_database ? "ok" : "pending"}`}>
                            db {tenant.has_database ? "ok" : "pend"}
                          </span>
                          <span className={`superadmin-chip ${channelsByTenant.get(tenant.id) ? "ok" : "pending"}`}>
                            wa {channelsByTenant.get(tenant.id) || 0}
                          </span>
                          <span className={`superadmin-chip ${tenant.has_odoo ? "ok" : "pending"}`}>
                            odoo {tenant.has_odoo ? "ok" : "pend"}
                          </span>
                        </div>
                        <div className="superadmin-date">{formatDateShort(tenant.created_at)}</div>
                        <div>
                          <button
                            className="sa-link"
                            type="button"
                            onClick={() => handleFocusTenant(tenant)}
                          >
                            Gestionar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="superadmin-empty">Sin tenants para mostrar.</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeModule === "tenants" && (
            <div className="superadmin-stack">
              <div className="superadmin-panel" ref={provisionRef}>
                <div className="superadmin-panel-header">
                  <div>
                    <div className="superadmin-panel-title">Provisionar tenant</div>
                    <div className="superadmin-panel-subtitle">
                      Alta completa, lista para operar
                    </div>
                  </div>
                  <div className="superadmin-panel-actions">
                    <span className="superadmin-pill">wizard</span>
                  </div>
                </div>
                <form className="superadmin-form" onSubmit={handleProvisionTenant}>
                  <div className="superadmin-form-section">
                    <div className="superadmin-form-title">Identidad</div>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Nombre</label>
                        <input
                          value={provisionForm.name}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, name: event.target.value })
                          }
                          placeholder="Clinica Perzivalh"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Slug</label>
                        <input
                          value={provisionForm.slug}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, slug: event.target.value })
                          }
                          placeholder="perzivalh"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Plan</label>
                        <input
                          value={provisionForm.plan}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, plan: event.target.value })
                          }
                          placeholder="starter"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Tenant DB URL</label>
                        <input
                          value={provisionForm.db_url}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, db_url: event.target.value })
                          }
                          placeholder="postgresql://..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="superadmin-form-section">
                    <div className="superadmin-form-title">Canal principal</div>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Phone Number ID</label>
                        <input
                          value={provisionForm.phone_number_id}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              phone_number_id: event.target.value,
                            })
                          }
                          placeholder="123456789"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>WABA ID</label>
                        <input
                          value={provisionForm.waba_id}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, waba_id: event.target.value })
                          }
                          placeholder="2003704870486290"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Verify Token</label>
                        <input
                          value={provisionForm.verify_token}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              verify_token: event.target.value,
                            })
                          }
                          placeholder="verify-token"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>WA Token</label>
                        <input
                          value={provisionForm.wa_token}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, wa_token: event.target.value })
                          }
                          placeholder="token"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>App Secret (opcional)</label>
                        <input
                          value={provisionForm.app_secret}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, app_secret: event.target.value })
                          }
                          placeholder="app-secret"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="superadmin-form-section">
                    <div className="superadmin-form-title">Branding</div>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Brand name</label>
                        <input
                          value={provisionForm.brand_name}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              brand_name: event.target.value,
                            })
                          }
                          placeholder="Perzivalh"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Logo URL</label>
                        <input
                          value={provisionForm.logo_url}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, logo_url: event.target.value })
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Timezone</label>
                        <input
                          value={provisionForm.timezone}
                          onChange={(event) =>
                            setProvisionForm({ ...provisionForm, timezone: event.target.value })
                          }
                          placeholder="America/La_Paz"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="superadmin-form-section">
                    <div className="superadmin-form-title">Odoo (opcional)</div>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Odoo Base URL</label>
                        <input
                          value={provisionForm.odoo_base_url}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              odoo_base_url: event.target.value,
                            })
                          }
                          placeholder="https://mi-odoo.com"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Odoo DB</label>
                        <input
                          value={provisionForm.odoo_db_name}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              odoo_db_name: event.target.value,
                            })
                          }
                          placeholder="mi_db"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Odoo User</label>
                        <input
                          value={provisionForm.odoo_username}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              odoo_username: event.target.value,
                            })
                          }
                          placeholder="usuario@empresa.com"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Odoo Password</label>
                        <input
                          type="password"
                          value={provisionForm.odoo_password}
                          onChange={(event) =>
                            setProvisionForm({
                              ...provisionForm,
                              odoo_password: event.target.value,
                            })
                          }
                          placeholder="********"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="superadmin-form-actions">
                    <button className="sa-button primary" type="submit" disabled={provisionBusy}>
                      {provisionBusy ? "Creando..." : "Provisionar tenant"}
                    </button>
                    <button
                      className="sa-button ghost"
                      type="button"
                      onClick={() => setProvisionForm(EMPTY_PROVISION)}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
              <div className="superadmin-grid">
                <div className="superadmin-panel" ref={manageRef}>
                  <div className="superadmin-panel-header">
                    <div>
                      <div className="superadmin-panel-title">Editar tenant</div>
                      <div className="superadmin-panel-subtitle">Nombre, slug y plan</div>
                    </div>
                  </div>
                  <form className="superadmin-form" onSubmit={handleUpdateTenant}>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Tenant</label>
                        <select
                          value={tenantUpdateForm.tenant_id}
                          onChange={(event) => handleTenantSelect(event.target.value)}
                        >
                          <option value="">Seleccionar</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="superadmin-field">
                        <label>Nombre</label>
                        <input
                          value={tenantUpdateForm.name}
                          onChange={(event) =>
                            setTenantUpdateForm({
                              ...tenantUpdateForm,
                              name: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Slug</label>
                        <input
                          value={tenantUpdateForm.slug}
                          onChange={(event) =>
                            setTenantUpdateForm({
                              ...tenantUpdateForm,
                              slug: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Plan</label>
                        <input
                          value={tenantUpdateForm.plan}
                          onChange={(event) =>
                            setTenantUpdateForm({
                              ...tenantUpdateForm,
                              plan: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Activo</label>
                        <select
                          value={tenantUpdateForm.is_active ? "true" : "false"}
                          onChange={(event) =>
                            setTenantUpdateForm({
                              ...tenantUpdateForm,
                              is_active: event.target.value === "true",
                            })
                          }
                        >
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                      </div>
                    </div>
                    <div className="superadmin-form-actions">
                      <button className="sa-button primary" type="submit">
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </div>

                <div className="superadmin-panel">
                  <div className="superadmin-panel-header">
                    <div>
                      <div className="superadmin-panel-title">Tenant DB</div>
                      <div className="superadmin-panel-subtitle">URL por tenant</div>
                    </div>
                  </div>
                  <form className="superadmin-form" onSubmit={handleSetDb}>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Tenant</label>
                        <select
                          value={dbForm.tenant_id}
                          onChange={(event) =>
                            setDbForm({ ...dbForm, tenant_id: event.target.value })
                          }
                        >
                          <option value="">Seleccionar</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="superadmin-field superadmin-span-2">
                        <label>Database URL</label>
                        <input
                          value={dbForm.db_url}
                          onChange={(event) =>
                            setDbForm({ ...dbForm, db_url: event.target.value })
                          }
                          placeholder="postgresql://..."
                        />
                      </div>
                    </div>
                    <div className="superadmin-form-actions">
                      <button className="sa-button primary" type="submit">
                        Guardar DB
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
          {activeModule === "channels" && (
            <div className="superadmin-stack">
              <div className="superadmin-grid">
                <div className="superadmin-panel">
                  <div className="superadmin-panel-header">
                    <div>
                      <div className="superadmin-panel-title">Nuevo canal</div>
                      <div className="superadmin-panel-subtitle">WhatsApp Cloud por linea</div>
                    </div>
                  </div>
                  <form className="superadmin-form" onSubmit={handleCreateChannel}>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Tenant</label>
                        <select
                          value={channelForm.tenant_id}
                          onChange={(event) =>
                            setChannelForm({
                              ...channelForm,
                              tenant_id: event.target.value,
                            })
                          }
                        >
                          <option value="">Seleccionar</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="superadmin-field">
                        <label>Phone Number ID</label>
                        <input
                          value={channelForm.phone_number_id}
                          onChange={(event) =>
                            setChannelForm({
                              ...channelForm,
                              phone_number_id: event.target.value,
                            })
                          }
                          placeholder="123456789"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>WABA ID</label>
                        <input
                          value={channelForm.waba_id}
                          onChange={(event) =>
                            setChannelForm({ ...channelForm, waba_id: event.target.value })
                          }
                          placeholder="2003704870486290"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Verify Token</label>
                        <input
                          value={channelForm.verify_token}
                          onChange={(event) =>
                            setChannelForm({
                              ...channelForm,
                              verify_token: event.target.value,
                            })
                          }
                          placeholder="verify-token"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>WA Token</label>
                        <input
                          value={channelForm.wa_token}
                          onChange={(event) =>
                            setChannelForm({ ...channelForm, wa_token: event.target.value })
                          }
                          placeholder="token"
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>App Secret (opcional)</label>
                        <input
                          value={channelForm.app_secret}
                          onChange={(event) =>
                            setChannelForm({
                              ...channelForm,
                              app_secret: event.target.value,
                            })
                          }
                          placeholder="app-secret"
                        />
                      </div>
                    </div>
                    <div className="superadmin-form-actions">
                      <button className="sa-button primary" type="submit">
                        Crear canal
                      </button>
                    </div>
                  </form>
                </div>

                <div className="superadmin-panel">
                  <div className="superadmin-panel-header">
                    <div>
                      <div className="superadmin-panel-title">Editar canal</div>
                      <div className="superadmin-panel-subtitle">Tokens y datos</div>
                    </div>
                  </div>
                  <form className="superadmin-form" onSubmit={handleUpdateChannel}>
                    <div className="superadmin-form-grid">
                      <div className="superadmin-field">
                        <label>Canal</label>
                        <select
                          value={channelUpdateForm.channel_id}
                          onChange={(event) => handleChannelSelect(event.target.value)}
                        >
                          <option value="">Seleccionar</option>
                          {channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.phone_number_id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="superadmin-field">
                        <label>Phone Number ID</label>
                        <input
                          value={channelUpdateForm.phone_number_id}
                          onChange={(event) =>
                            setChannelUpdateForm({
                              ...channelUpdateForm,
                              phone_number_id: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>WABA ID</label>
                        <input
                          value={channelUpdateForm.waba_id}
                          onChange={(event) =>
                            setChannelUpdateForm({
                              ...channelUpdateForm,
                              waba_id: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>Verify Token (nuevo)</label>
                        <input
                          value={channelUpdateForm.verify_token}
                          onChange={(event) =>
                            setChannelUpdateForm({
                              ...channelUpdateForm,
                              verify_token: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>WA Token (nuevo)</label>
                        <input
                          value={channelUpdateForm.wa_token}
                          onChange={(event) =>
                            setChannelUpdateForm({
                              ...channelUpdateForm,
                              wa_token: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="superadmin-field">
                        <label>App Secret (nuevo)</label>
                        <input
                          value={channelUpdateForm.app_secret}
                          onChange={(event) =>
                            setChannelUpdateForm({
                              ...channelUpdateForm,
                              app_secret: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="superadmin-form-actions">
                      <button className="sa-button primary" type="submit">
                        Actualizar canal
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="superadmin-panel">
                <div className="superadmin-panel-header">
                  <div>
                    <div className="superadmin-panel-title">Canales registrados</div>
                    <div className="superadmin-panel-subtitle">Todas las lineas activas</div>
                  </div>
                </div>
                <div className="superadmin-table">
                  <div className="superadmin-table-head">
                    <div>Phone Number ID</div>
                    <div>Tenant</div>
                    <div>WABA</div>
                    <div>Creado</div>
                  </div>
                  {channels.length ? (
                    channels.map((channel) => (
                      <div key={channel.id} className="superadmin-table-row">
                        <div className="superadmin-ref">{channel.phone_number_id}</div>
                        <div className="superadmin-tenant-meta">
                          {channel.tenant_id.slice(0, 8)}
                        </div>
                        <div className="superadmin-date">{channel.waba_id || "n/a"}</div>
                        <div className="superadmin-date">{formatDateShort(channel.created_at)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="superadmin-empty">Sin canales.</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeModule === "branding" && (
            <div className="superadmin-stack">
              <div className="superadmin-panel">
                <div className="superadmin-panel-header">
                  <div>
                    <div className="superadmin-panel-title">Branding</div>
                    <div className="superadmin-panel-subtitle">Nombre, logo y colores</div>
                  </div>
                </div>
                <form className="superadmin-form" onSubmit={handleSaveBranding}>
                  <div className="superadmin-form-grid">
                    <div className="superadmin-field">
                      <label>Tenant</label>
                      <select
                        value={brandingForm.tenant_id}
                        onChange={(event) =>
                          setBrandingForm({
                            ...brandingForm,
                            tenant_id: event.target.value,
                          })
                        }
                      >
                        <option value="">Seleccionar</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="superadmin-field">
                      <label>Brand name</label>
                      <input
                        value={brandingForm.brand_name}
                        onChange={(event) =>
                          setBrandingForm({
                            ...brandingForm,
                            brand_name: event.target.value,
                          })
                        }
                        placeholder="Perzivalh"
                      />
                    </div>
                    <div className="superadmin-field">
                      <label>Logo URL</label>
                      <input
                        value={brandingForm.logo_url}
                        onChange={(event) =>
                          setBrandingForm({
                            ...brandingForm,
                            logo_url: event.target.value,
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="superadmin-field">
                      <label>Colors (JSON)</label>
                      <input
                        value={brandingForm.colors}
                        onChange={(event) =>
                          setBrandingForm({
                            ...brandingForm,
                            colors: event.target.value,
                          })
                        }
                        placeholder='{"primary":"#1e3a8a"}'
                      />
                    </div>
                    <div className="superadmin-field">
                      <label>Timezone</label>
                      <input
                        value={brandingForm.timezone}
                        onChange={(event) =>
                          setBrandingForm({
                            ...brandingForm,
                            timezone: event.target.value,
                          })
                        }
                        placeholder="America/La_Paz"
                      />
                    </div>
                  </div>
                  <div className="superadmin-form-actions">
                    <button className="sa-button primary" type="submit">
                      Guardar branding
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeModule === "odoo" && (
            <div className="superadmin-stack">
              <div className="superadmin-panel">
                <div className="superadmin-panel-header">
                  <div>
                    <div className="superadmin-panel-title">Odoo</div>
                    <div className="superadmin-panel-subtitle">Config por tenant</div>
                  </div>
                </div>
                <form className="superadmin-form" onSubmit={handleSaveOdoo}>
                  <div className="superadmin-form-grid">
                    <div className="superadmin-field">
                      <label>Tenant</label>
                      <select
                        value={odooForm.tenant_id}
                        onChange={(event) => loadOdooConfig(event.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="superadmin-field">
                      <label>Odoo Base URL</label>
                      <input
                        value={odooForm.base_url}
                        onChange={(event) =>
                          setOdooForm({ ...odooForm, base_url: event.target.value })
                        }
                        placeholder="https://mi-odoo.com"
                      />
                    </div>
                    <div className="superadmin-field">
                      <label>Odoo DB</label>
                      <input
                        value={odooForm.db_name}
                        onChange={(event) =>
                          setOdooForm({ ...odooForm, db_name: event.target.value })
                        }
                        placeholder="mi_db"
                      />
                    </div>
                    <div className="superadmin-field">
                      <label>Odoo User</label>
                      <input
                        value={odooForm.username}
                        onChange={(event) =>
                          setOdooForm({ ...odooForm, username: event.target.value })
                        }
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div className="superadmin-field">
                      <label>Odoo Password</label>
                      <input
                        type="password"
                        value={odooForm.password}
                        onChange={(event) =>
                          setOdooForm({ ...odooForm, password: event.target.value })
                        }
                        placeholder="********"
                      />
                    </div>
                  </div>
                  <div className="superadmin-form-actions">
                    <button className="sa-button primary" type="submit">
                      Guardar Odoo
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default SuperAdminView;
