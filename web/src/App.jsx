
import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, setToken } from "./api";
import { connectSocket } from "./socket";

const STATUS_OPTIONS = ["open", "pending", "closed"];
const ROLE_OPTIONS = ["admin", "recepcion", "caja", "marketing", "doctor"];

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

function formatCompactDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString();
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return "-";
  }
  const minutes = Math.round(Number(seconds) / 60);
  if (!Number.isFinite(minutes)) {
    return "-";
  }
  return `${minutes} min`;
}

function normalizeError(error) {
  if (!error) {
    return "Error inesperado";
  }
  if (typeof error === "string") {
    return error;
  }
  return error.message || "Error inesperado";
}

function sortConversations(list) {
  return [...list].sort((a, b) => {
    const aTime = new Date(a.last_message_at || a.created_at || 0).getTime();
    const bTime = new Date(b.last_message_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function hasRole(user, roles) {
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

function App() {
  const [token, setTokenState] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState("inbox");
  const [adminTab, setAdminTab] = useState("users");

  const [filters, setFilters] = useState({
    status: "",
    assigned_user_id: "",
    tag: "",
    search: "",
  });
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageMode, setMessageMode] = useState("text");
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [pageError, setPageError] = useState("");

  const [metrics, setMetrics] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignMessages, setCampaignMessages] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    template_id: "",
    scheduled_for: "",
  });
  const [campaignFilter, setCampaignFilter] = useState({
    status: "",
    tag: "",
    assigned_user_id: "",
    verified_only: false,
  });

  const [adminUsers, setAdminUsers] = useState([]);
  const [userForm, setUserForm] = useState({
    id: "",
    name: "",
    email: "",
    role: "recepcion",
    password: "",
    is_active: true,
  });

  const [settings, setSettings] = useState(null);

  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [branchForm, setBranchForm] = useState({
    id: "",
    code: "",
    name: "",
    address: "",
    lat: "",
    lng: "",
    hours_text: "",
    phone: "",
    is_active: true,
  });
  const [serviceForm, setServiceForm] = useState({
    id: "",
    code: "",
    name: "",
    subtitle: "",
    description: "",
    price_bob: "",
    duration_min: "",
    image_url: "",
    is_featured: false,
    is_active: true,
  });

  const [templateForm, setTemplateForm] = useState({
    id: "",
    name: "",
    language: "es",
    category: "",
    body_preview: "",
    is_active: true,
  });
  const [auditLogs, setAuditLogs] = useState([]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === campaignForm.template_id),
    [templates, campaignForm.template_id]
  );

  useEffect(() => {
    if (token) {
      setToken(token);
    } else {
      setToken(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    apiGet("/api/me")
      .then((data) => {
        if (!active) {
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setTokenState("");
        setUser(null);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void loadUsers();
    void loadTags();
  }, [user]);

  useEffect(() => {
    if (!user || view !== "inbox") {
      return;
    }
    void loadConversations();
  }, [user, view, filters]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (view === "dashboard") {
      void loadMetrics();
    }
    if (view === "campaigns") {
      void loadTemplates();
      void loadCampaigns();
    }
  }, [user, view]);

  useEffect(() => {
    if (!user || view !== "admin") {
      return;
    }
    if (
      !hasRole(user, ["admin"]) &&
      ["users", "settings", "audit"].includes(adminTab)
    ) {
      setAdminTab("catalog");
    }
    if (adminTab === "users") {
      void loadAdminUsers();
    }
    if (adminTab === "settings") {
      void loadSettings();
    }
    if (adminTab === "catalog") {
      void loadCatalog();
    }
    if (adminTab === "templates") {
      void loadTemplates();
    }
    if (adminTab === "audit") {
      void loadAuditLogs();
    }
  }, [user, view, adminTab]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const socket = connectSocket(token);
    socket.on("conversation:update", ({ conversation }) => {
      setConversations((prev) => {
        const next = prev.map((item) =>
          item.id === conversation.id ? conversation : item
        );
        if (!next.find((item) => item.id === conversation.id)) {
          next.push(conversation);
        }
        return sortConversations(next);
      });
      setActiveConversation((prev) =>
        prev?.id === conversation.id ? conversation : prev
      );
    });
    socket.on("message:new", ({ conversation, message }) => {
      setConversations((prev) => {
        const next = prev.map((item) =>
          item.id === conversation.id ? conversation : item
        );
        if (!next.find((item) => item.id === conversation.id)) {
          next.push(conversation);
        }
        return sortConversations(next);
      });
      setActiveConversation((prev) =>
        prev?.id === conversation.id ? conversation : prev
      );
      setMessages((prev) => {
        if (!activeConversation || activeConversation.id !== conversation.id) {
          return prev;
        }
        return [...prev, message];
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [token, activeConversation]);
  async function loadUsers() {
    try {
      const data = await apiGet("/api/users");
      setUsers(data.users || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadTags() {
    try {
      const data = await apiGet("/api/tags");
      setTags(data.tags || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadConversations() {
    try {
      const query = buildQuery(filters);
      const data = await apiGet(`/api/conversations${query}`);
      setConversations(sortConversations(data.conversations || []));
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadConversation(conversationId) {
    setLoadingConversation(true);
    try {
      const data = await apiGet(`/api/conversations/${conversationId}`);
      setActiveConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (error) {
      setPageError(normalizeError(error));
    } finally {
      setLoadingConversation(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    try {
      const result = await apiPost("/api/auth/login", {
        email: loginForm.email,
        password: loginForm.password,
      });
      setTokenState(result.token);
      setUser(result.user);
      setView("inbox");
    } catch (error) {
      setLoginError("Credenciales invalidas");
    }
  }

  function handleLogout() {
    setTokenState("");
    setUser(null);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setView("inbox");
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!activeConversation || !messageDraft.trim()) {
      return;
    }
    const text = messageDraft.trim();
    setMessageDraft("");
    try {
      await apiPost(`/api/conversations/${activeConversation.id}/messages`, {
        text,
        type: messageMode,
      });
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleAssignSelf() {
    if (!activeConversation) {
      return;
    }
    try {
      const data = await apiPost(`/api/conversations/${activeConversation.id}/assign`);
      setActiveConversation(data.conversation);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleStatusChange(status) {
    if (!activeConversation) {
      return;
    }
    try {
      const data = await apiPost(`/api/conversations/${activeConversation.id}/status`, {
        status,
      });
      setActiveConversation(data.conversation);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleToggleTag(tagName) {
    if (!activeConversation) {
      return;
    }
    const hasTag =
      activeConversation.tags?.some((tag) => tag.name === tagName) || false;
    try {
      const data = await apiPost(`/api/conversations/${activeConversation.id}/tags`, {
        add: hasTag ? [] : [tagName],
        remove: hasTag ? [tagName] : [],
      });
      setActiveConversation(data.conversation);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleAddTag(event) {
    event.preventDefault();
    if (!tagInput.trim() || !activeConversation) {
      return;
    }
    const name = tagInput.trim();
    setTagInput("");
    try {
      const data = await apiPost(`/api/conversations/${activeConversation.id}/tags`, {
        add: [name],
      });
      setActiveConversation(data.conversation);
      await loadTags();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadMetrics() {
    try {
      const data = await apiGet("/api/dashboard/metrics");
      setMetrics(data);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadTemplates() {
    try {
      const data = await apiGet("/api/admin/templates");
      setTemplates(data.templates || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadCampaigns() {
    try {
      const data = await apiGet("/api/admin/campaigns");
      setCampaigns(data.campaigns || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadCampaignMessages(campaignId) {
    setSelectedCampaignId(campaignId);
    try {
      const data = await apiGet(`/api/admin/campaigns/${campaignId}/messages`);
      setCampaignMessages(data.messages || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleCreateCampaign(event) {
    event.preventDefault();
    if (!campaignForm.name.trim() || !campaignForm.template_id) {
      setPageError("Completa el nombre y plantilla");
      return;
    }
    const filter = {};
    if (campaignFilter.status) {
      filter.status = campaignFilter.status;
    }
    if (campaignFilter.tag) {
      filter.tag = campaignFilter.tag.trim();
    }
    if (campaignFilter.assigned_user_id) {
      filter.assigned_user_id = campaignFilter.assigned_user_id;
    }
    if (campaignFilter.verified_only) {
      filter.verified_only = true;
    }
    try {
      await apiPost("/api/admin/campaigns", {
        name: campaignForm.name.trim(),
        template_id: campaignForm.template_id,
        audience_filter: filter,
        scheduled_for: campaignForm.scheduled_for || null,
      });
      setCampaignForm({ name: "", template_id: "", scheduled_for: "" });
      setCampaignFilter({
        status: "",
        tag: "",
        assigned_user_id: "",
        verified_only: false,
      });
      await loadCampaigns();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleSendCampaign(campaignId) {
    try {
      await apiPost(`/api/admin/campaigns/${campaignId}/send`, {});
      await loadCampaigns();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleSyncTemplates() {
    try {
      await apiPost("/api/admin/templates/sync", {});
      await loadTemplates();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadAdminUsers() {
    try {
      const data = await apiGet("/api/admin/users");
      setAdminUsers(data.users || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleUserSubmit(event) {
    event.preventDefault();
    if (!userForm.name.trim() || !userForm.role) {
      setPageError("Completa los campos requeridos");
      return;
    }
    try {
      if (userForm.id) {
        await apiPatch(`/api/admin/users/${userForm.id}`, {
          name: userForm.name.trim(),
          role: userForm.role,
          is_active: userForm.is_active,
          password: userForm.password || undefined,
        });
      } else {
        await apiPost("/api/admin/users", {
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
          password: userForm.password,
        });
      }
      setUserForm({
        id: "",
        name: "",
        email: "",
        role: "recepcion",
        password: "",
        is_active: true,
      });
      await loadAdminUsers();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadSettings() {
    try {
      const data = await apiGet("/api/admin/settings");
      setSettings(data.settings);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleSaveSettings() {
    if (!settings) {
      return;
    }
    try {
      const data = await apiPatch("/api/admin/settings", {
        bot_enabled: settings.bot_enabled,
        auto_reply_enabled: settings.auto_reply_enabled,
      });
      setSettings(data.settings);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadCatalog() {
    try {
      const [branchData, serviceData] = await Promise.all([
        apiGet("/api/admin/branches"),
        apiGet("/api/admin/services"),
      ]);
      setBranches(branchData.branches || []);
      setServices(serviceData.services || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleBranchSubmit(event) {
    event.preventDefault();
    if (!branchForm.code.trim() || !branchForm.name.trim()) {
      setPageError("Completa codigo y nombre");
      return;
    }
    const payload = {
      code: branchForm.code.trim(),
      name: branchForm.name.trim(),
      address: branchForm.address.trim(),
      lat: branchForm.lat !== "" ? Number(branchForm.lat) : 0,
      lng: branchForm.lng !== "" ? Number(branchForm.lng) : 0,
      hours_text: branchForm.hours_text.trim(),
      phone: branchForm.phone.trim() || null,
      is_active: branchForm.is_active,
    };
    try {
      if (branchForm.id) {
        await apiPatch(`/api/admin/branches/${branchForm.id}`, payload);
      } else {
        await apiPost("/api/admin/branches", payload);
      }
      setBranchForm({
        id: "",
        code: "",
        name: "",
        address: "",
        lat: "",
        lng: "",
        hours_text: "",
        phone: "",
        is_active: true,
      });
      await loadCatalog();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleBranchDisable(branchId) {
    try {
      await apiDelete(`/api/admin/branches/${branchId}`);
      await loadCatalog();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    if (!serviceForm.code.trim() || !serviceForm.name.trim()) {
      setPageError("Completa codigo y nombre");
      return;
    }
    const payload = {
      code: serviceForm.code.trim(),
      name: serviceForm.name.trim(),
      subtitle: serviceForm.subtitle.trim() || null,
      description: serviceForm.description.trim(),
      price_bob: serviceForm.price_bob ? Number(serviceForm.price_bob) : 0,
      duration_min: serviceForm.duration_min
        ? Number(serviceForm.duration_min)
        : null,
      image_url: serviceForm.image_url.trim() || null,
      is_featured: serviceForm.is_featured,
      is_active: serviceForm.is_active,
    };
    try {
      if (serviceForm.id) {
        await apiPatch(`/api/admin/services/${serviceForm.id}`, payload);
      } else {
        await apiPost("/api/admin/services", payload);
      }
      setServiceForm({
        id: "",
        code: "",
        name: "",
        subtitle: "",
        description: "",
        price_bob: "",
        duration_min: "",
        image_url: "",
        is_featured: false,
        is_active: true,
      });
      await loadCatalog();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleServiceDisable(serviceId) {
    try {
      await apiDelete(`/api/admin/services/${serviceId}`);
      await loadCatalog();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleServiceBranchToggle(service, branchId, isAvailable) {
    if (!service) {
      return;
    }
    try {
      await apiPost(`/api/admin/services/${service.id}/branches`, {
        branch_id: branchId,
        is_available: isAvailable,
      });
      await loadCatalog();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function handleTemplateSubmit(event) {
    event.preventDefault();
    if (!templateForm.name.trim()) {
      setPageError("Completa el nombre");
      return;
    }
    const payload = {
      name: templateForm.name.trim(),
      language: templateForm.language.trim() || "es",
      category: templateForm.category.trim() || null,
      body_preview: templateForm.body_preview.trim(),
      is_active: templateForm.is_active,
    };
    try {
      if (templateForm.id) {
        await apiPatch(`/api/admin/templates/${templateForm.id}`, payload);
      } else {
        await apiPost("/api/admin/templates", payload);
      }
      setTemplateForm({
        id: "",
        name: "",
        language: "es",
        category: "",
        body_preview: "",
        is_active: true,
      });
      await loadTemplates();
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  async function loadAuditLogs() {
    try {
      const data = await apiGet("/api/admin/audit?limit=200");
      setAuditLogs(data.logs || []);
    } catch (error) {
      setPageError(normalizeError(error));
    }
  }

  if (!token || !user) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-title">Podopie OS</div>
          <div className="login-subtitle">Acceso a bandeja multiusuario</div>
          <form className="login-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>
            {loginError ? <div className="error">{loginError}</div> : null}
            <button className="primary" type="submit">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const canSeeCampaigns = hasRole(user, ["admin", "marketing"]);
  const canSeeAdmin = hasRole(user, ["admin", "marketing"]);
  const canAdminSettings = hasRole(user, ["admin"]);
  const canManageStatus = hasRole(user, ["admin", "recepcion"]);

  const statusCounts = useMemo(() => {
    const map = { open: 0, pending: 0, closed: 0 };
    (metrics?.status_counts || []).forEach((item) => {
      map[item.status] = item._count.status;
    });
    return map;
  }, [metrics]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <span className="brand-title">Podopie OS</span>
            <span className="brand-sub">Hola, {user.name}</span>
          </div>
          <button className="ghost" onClick={handleLogout}>
            Salir
          </button>
        </div>

        <nav className="nav">
          <button
            className={`nav-button ${view === "inbox" ? "active" : ""}`}
            onClick={() => setView("inbox")}
          >
            Inbox
          </button>
          <button
            className={`nav-button ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          {canSeeCampaigns && (
            <button
              className={`nav-button ${view === "campaigns" ? "active" : ""}`}
              onClick={() => setView("campaigns")}
            >
              Campanas
            </button>
          )}
          {canSeeAdmin && (
            <button
              className={`nav-button ${view === "admin" ? "active" : ""}`}
              onClick={() => setView("admin")}
            >
              Admin
            </button>
          )}
        </nav>

        {view === "inbox" && (
          <>
            <div className="filters">
              <label className="field compact">
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Asignado</span>
                <select
                  value={filters.assigned_user_id}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      assigned_user_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="unassigned">Sin asignar</option>
                  {users.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Tag</span>
                <select
                  value={filters.tag}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, tag: event.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  {tags.map((tag) => (
                    <option value={tag.name} key={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Buscar</span>
                <input
                  type="text"
                  placeholder="Telefono o nombre"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="list-header">
              <span>Conversaciones</span>
              <span>{conversations.length}</span>
            </div>

            <div className="conversation-list">
              {conversations.map((conversation) => {
                const active = activeConversation?.id === conversation.id;
                const pendingUnassigned =
                  conversation.status === "pending" &&
                  !conversation.assigned_user_id;
                return (
                  <button
                    key={conversation.id}
                    className={`conversation-item ${active ? "active" : ""}`}
                    onClick={() => loadConversation(conversation.id)}
                  >
                    <div className="row">
                      <span className="name">
                        {conversation.display_name ||
                          conversation.phone_e164 ||
                          conversation.wa_id}
                      </span>
                      <span className={`status ${conversation.status}`}>
                        {conversation.status}
                      </span>
                    </div>
                    <div className="row subtle">
                      <span>
                        {conversation.assigned_user?.name || "Sin asignar"}
                      </span>
                      <span>{formatCompactDate(conversation.last_message_at)}</span>
                    </div>
                    {pendingUnassigned && (
                      <span className="badge wide">Pendiente sin asignar</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>

      <main className="content">
        {view === "inbox" && (
          <section className="chat">
            <header className="chat-header">
              <div>
                <div className="chat-title">
                  {activeConversation
                    ? activeConversation.display_name ||
                      activeConversation.phone_e164 ||
                      activeConversation.wa_id
                    : "Selecciona una conversacion"}
                </div>
                <div className="chat-sub">
                  {activeConversation
                    ? `Status: ${activeConversation.status} - Asignado: ${
                        activeConversation.assigned_user?.name || "Sin asignar"
                      }`
                    : "Elige una conversacion para ver detalles"}
                </div>
              </div>
              <div className="chat-actions">
                <button className="ghost" onClick={handleAssignSelf}>
                  Tomar conversacion
                </button>
                {canManageStatus && (
                  <>
                    <button
                      className="ghost"
                      onClick={() => handleStatusChange("open")}
                    >
                      Reactivar bot
                    </button>
                    <button
                      className="ghost"
                      onClick={() => handleStatusChange("pending")}
                    >
                      Marcar pendiente
                    </button>
                    <button
                      className="danger"
                      onClick={() => handleStatusChange("closed")}
                    >
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </header>

            <div className="chat-body">
              {loadingConversation && <div className="empty">Cargando...</div>}
              {!loadingConversation && !activeConversation && (
                <div className="empty">Selecciona una conversacion</div>
              )}
              {!loadingConversation &&
                activeConversation &&
                messages.map((message) => {
                  const typeClass = message.type === "note" ? "note" : "";
                  return (
                    <div
                      key={message.id}
                      className={`message ${message.direction} ${typeClass}`}
                    >
                      <div className="message-text">
                        {message.text || `[${message.type}]`}
                      </div>
                      <div className="message-meta">
                        {formatDate(message.created_at)}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="chat-aside">
              <div className="panel">
                <div className="panel-title">Tags</div>
                <div className="tag-list">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      className={`tag ${
                        activeConversation?.tags?.some(
                          (item) => item.name === tag.name
                        )
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleToggleTag(tag.name)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                <form className="tag-form" onSubmit={handleAddTag}>
                  <input
                    type="text"
                    placeholder="Nuevo tag"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                  />
                  <button className="ghost" type="submit">
                    Agregar
                  </button>
                </form>
              </div>
              <div className="panel">
                <div className="panel-title">Datos</div>
                {activeConversation ? (
                  <>
                    <div className="panel-row">
                      <span>WA ID</span>
                      <span>{activeConversation.wa_id}</span>
                    </div>
                    <div className="panel-row">
                      <span>Telefono</span>
                      <span>{activeConversation.phone_e164}</span>
                    </div>
                    <div className="panel-row">
                      <span>Partner ID</span>
                      <span>{activeConversation.partner_id || "-"}</span>
                    </div>
                    <div className="panel-row">
                      <span>Paciente ID</span>
                      <span>{activeConversation.patient_id || "-"}</span>
                    </div>
                    <div className="panel-row">
                      <span>Verificado</span>
                      <span>{activeConversation.verified_at ? "Si" : "No"}</span>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">Sin conversacion</div>
                )}
              </div>
            </div>

            <form className="composer" onSubmit={handleSendMessage}>
              <label className="field grow">
                <span>Mensaje</span>
                <input
                  type="text"
                  placeholder="Escribe un mensaje"
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                />
              </label>
              <label className="field compact">
                <span>Modo</span>
                <select
                  value={messageMode}
                  onChange={(event) => setMessageMode(event.target.value)}
                >
                  <option value="text">WhatsApp</option>
                  <option value="note">Nota interna</option>
                </select>
              </label>
              <button className="primary" type="submit">
                Enviar
              </button>
            </form>
          </section>
        )}
        {view === "dashboard" && (
          <section className="page">
            <div className="page-header">
              <h2>Dashboard</h2>
              <button className="ghost" onClick={loadMetrics}>
                Actualizar
              </button>
            </div>
            <div className="dashboard-grid">
              <div className="metric-card">
                <div className="metric-label">Open</div>
                <div className="metric-value">{statusCounts.open}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Pending</div>
                <div className="metric-value">{statusCounts.pending}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Closed</div>
                <div className="metric-value">{statusCounts.closed}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Avg 1ra respuesta</div>
                <div className="metric-value">
                  {formatDuration(metrics?.avg_first_reply_seconds)}
                </div>
              </div>
            </div>
            <div className="page-grid">
              <div className="panel">
                <div className="panel-title">Mensajes por dia</div>
                <div className="table">
                  <div className="table-head">
                    <span>Dia</span>
                    <span>In</span>
                    <span>Out</span>
                  </div>
                  {(metrics?.message_volume || []).map((item) => (
                    <div className="table-row" key={item.day}>
                      <span>{formatCompactDate(item.day)}</span>
                      <span>{item.in_count}</span>
                      <span>{item.out_count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-title">Top tags</div>
                <div className="table">
                  <div className="table-head">
                    <span>Tag</span>
                    <span>Conteo</span>
                  </div>
                  {(metrics?.top_tags || []).map((item) => (
                    <div className="table-row" key={item.name}>
                      <span>{item.name}</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        {view === "campaigns" && (
          <section className="page">
            <div className="page-header">
              <h2>Campanas</h2>
              <button className="ghost" onClick={loadCampaigns}>
                Actualizar
              </button>
            </div>
            <div className="page-grid">
              <div className="panel">
                <div className="panel-title">Nueva campana</div>
                <form className="form-grid" onSubmit={handleCreateCampaign}>
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={campaignForm.name}
                      onChange={(event) =>
                        setCampaignForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Template</span>
                    <select
                      value={campaignForm.template_id}
                      onChange={(event) =>
                        setCampaignForm((prev) => ({
                          ...prev,
                          template_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona plantilla</option>
                      {templates.map((template) => (
                        <option value={template.id} key={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Programar (opcional)</span>
                    <input
                      type="datetime-local"
                      value={campaignForm.scheduled_for}
                      onChange={(event) =>
                        setCampaignForm((prev) => ({
                          ...prev,
                          scheduled_for: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Status filtro</span>
                    <select
                      value={campaignFilter.status}
                      onChange={(event) =>
                        setCampaignFilter((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((status) => (
                        <option value={status} key={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Tag</span>
                    <input
                      type="text"
                      value={campaignFilter.tag}
                      onChange={(event) =>
                        setCampaignFilter((prev) => ({
                          ...prev,
                          tag: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Asignado</span>
                    <select
                      value={campaignFilter.assigned_user_id}
                      onChange={(event) =>
                        setCampaignFilter((prev) => ({
                          ...prev,
                          assigned_user_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Todos</option>
                      <option value="unassigned">Sin asignar</option>
                      {users.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={campaignFilter.verified_only}
                      onChange={(event) =>
                        setCampaignFilter((prev) => ({
                          ...prev,
                          verified_only: event.target.checked,
                        }))
                      }
                    />
                    Solo verificados
                  </label>
                  <div className="form-actions">
                    <button className="primary" type="submit">
                      Crear campana
                    </button>
                  </div>
                </form>
                <div className="panel-subtitle">Preview</div>
                <div className="preview-box">
                  {selectedTemplate?.body_preview ||
                    "Selecciona una plantilla para ver preview"}
                </div>
              </div>
              <div className="panel">
                <div className="panel-title">Listado</div>
                <div className="table">
                  <div className="table-head">
                    <span>Nombre</span>
                    <span>Status</span>
                    <span>Accion</span>
                  </div>
                  {campaigns.map((campaign) => (
                    <div className="table-row" key={campaign.id}>
                      <span>{campaign.name}</span>
                      <span>{campaign.status}</span>
                      <div className="row-actions">
                        <button
                          className="ghost"
                          onClick={() => loadCampaignMessages(campaign.id)}
                        >
                          Ver mensajes
                        </button>
                        <button
                          className="primary"
                          onClick={() => handleSendCampaign(campaign.id)}
                          disabled={campaign.status === "sending"}
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedCampaignId && (
                  <>
                    <div className="panel-title">Mensajes</div>
                    <div className="table">
                      <div className="table-head">
                        <span>WA</span>
                        <span>Status</span>
                        <span>Enviado</span>
                      </div>
                      {campaignMessages.map((message) => (
                        <div className="table-row" key={message.id}>
                          <span>{message.wa_id}</span>
                          <span>{message.status}</span>
                          <span>{formatDate(message.sent_at)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
        {view === "admin" && (
          <section className="page">
            <div className="page-header">
              <h2>Admin</h2>
              <div className="tab-row">
                {hasRole(user, ["admin"]) && (
                  <>
                    <button
                      className={`tab-button ${
                        adminTab === "users" ? "active" : ""
                      }`}
                      onClick={() => setAdminTab("users")}
                    >
                      Usuarios
                    </button>
                    <button
                      className={`tab-button ${
                        adminTab === "settings" ? "active" : ""
                      }`}
                      onClick={() => setAdminTab("settings")}
                    >
                      Settings
                    </button>
                  </>
                )}
                <button
                  className={`tab-button ${
                    adminTab === "catalog" ? "active" : ""
                  }`}
                  onClick={() => setAdminTab("catalog")}
                >
                  Catalogo
                </button>
                <button
                  className={`tab-button ${
                    adminTab === "templates" ? "active" : ""
                  }`}
                  onClick={() => setAdminTab("templates")}
                >
                  Templates
                </button>
                {hasRole(user, ["admin"]) && (
                  <button
                    className={`tab-button ${
                      adminTab === "audit" ? "active" : ""
                    }`}
                    onClick={() => setAdminTab("audit")}
                  >
                    Audit
                  </button>
                )}
              </div>
            </div>

            {adminTab === "users" && canAdminSettings && (
              <div className="page-grid">
                <div className="panel">
                  <div className="panel-title">Usuarios</div>
                  <div className="table">
                    <div className="table-head">
                      <span>Nombre</span>
                      <span>Rol</span>
                      <span>Estado</span>
                      <span>Accion</span>
                    </div>
                    {adminUsers.map((item) => (
                      <div className="table-row" key={item.id}>
                        <span>{item.name}</span>
                        <span>{item.role}</span>
                        <span>{item.is_active ? "Activo" : "Inactivo"}</span>
                        <button
                          className="ghost"
                          onClick={() =>
                            setUserForm({
                              id: item.id,
                              name: item.name,
                              email: item.email,
                              role: item.role,
                              password: "",
                              is_active: item.is_active,
                            })
                          }
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-title">
                    {userForm.id ? "Editar usuario" : "Crear usuario"}
                  </div>
                  <form className="form-grid" onSubmit={handleUserSubmit}>
                    <label className="field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        disabled={Boolean(userForm.id)}
                      />
                    </label>
                    <label className="field">
                      <span>Rol</span>
                      <select
                        value={userForm.role}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            role: event.target.value,
                          }))
                        }
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option value={role} key={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Password</span>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            password: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={userForm.is_active}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            is_active: event.target.checked,
                          }))
                        }
                      />
                      Activo
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        {userForm.id ? "Guardar cambios" : "Crear"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {adminTab === "settings" && canAdminSettings && (
              <div className="panel">
                <div className="panel-title">Settings</div>
                {settings ? (
                  <>
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
                      Bot enabled
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
                      Auto reply enabled
                    </label>
                    <button className="primary" onClick={handleSaveSettings}>
                      Guardar settings
                    </button>
                  </>
                ) : (
                  <div className="empty-state">Cargando settings...</div>
                )}
              </div>
            )}
            {adminTab === "catalog" && (
              <div className="page-grid">
                <div className="panel">
                  <div className="panel-title">Sucursales</div>
                  <div className="table">
                    <div className="table-head">
                      <span>Nombre</span>
                      <span>Codigo</span>
                      <span>Estado</span>
                      <span>Accion</span>
                    </div>
                    {branches.map((branch) => (
                      <div className="table-row" key={branch.id}>
                        <span>{branch.name}</span>
                        <span>{branch.code}</span>
                        <span>{branch.is_active ? "Activa" : "Inactiva"}</span>
                        <div className="row-actions">
                          <button
                            className="ghost"
                            onClick={() =>
                              setBranchForm({
                                id: branch.id,
                                code: branch.code,
                                name: branch.name,
                                address: branch.address,
                                lat: branch.lat,
                                lng: branch.lng,
                                hours_text: branch.hours_text,
                                phone: branch.phone || "",
                                is_active: branch.is_active,
                              })
                            }
                          >
                            Editar
                          </button>
                          <button
                            className="danger"
                            onClick={() => handleBranchDisable(branch.id)}
                          >
                            Desactivar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="panel-title">
                    {branchForm.id ? "Editar sucursal" : "Crear sucursal"}
                  </div>
                  <form className="form-grid" onSubmit={handleBranchSubmit}>
                    <label className="field">
                      <span>Codigo</span>
                      <input
                        type="text"
                        value={branchForm.code}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            code: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={branchForm.name}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Direccion</span>
                      <input
                        type="text"
                        value={branchForm.address}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            address: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Lat</span>
                      <input
                        type="number"
                        value={branchForm.lat}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            lat: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Lng</span>
                      <input
                        type="number"
                        value={branchForm.lng}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            lng: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Telefono</span>
                      <input
                        type="text"
                        value={branchForm.phone}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Horarios</span>
                      <textarea
                        rows="3"
                        value={branchForm.hours_text}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            hours_text: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={branchForm.is_active}
                        onChange={(event) =>
                          setBranchForm((prev) => ({
                            ...prev,
                            is_active: event.target.checked,
                          }))
                        }
                      />
                      Activa
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>

                <div className="panel">
                  <div className="panel-title">Servicios</div>
                  <div className="table">
                    <div className="table-head">
                      <span>Servicio</span>
                      <span>Precio</span>
                      <span>Estado</span>
                      <span>Accion</span>
                    </div>
                    {services.map((service) => (
                      <div className="table-row" key={service.id}>
                        <span>{service.name}</span>
                        <span>Bs {service.price_bob}</span>
                        <span>{service.is_active ? "Activo" : "Inactivo"}</span>
                        <div className="row-actions">
                          <button
                            className="ghost"
                            onClick={() =>
                              setServiceForm({
                                id: service.id,
                                code: service.code,
                                name: service.name,
                                subtitle: service.subtitle || "",
                                description: service.description,
                                price_bob: service.price_bob,
                                duration_min: service.duration_min || "",
                                image_url: service.image_url || "",
                                is_featured: service.is_featured,
                                is_active: service.is_active,
                              })
                            }
                          >
                            Editar
                          </button>
                          <button
                            className="danger"
                            onClick={() => handleServiceDisable(service.id)}
                          >
                            Desactivar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="panel-title">
                    {serviceForm.id ? "Editar servicio" : "Crear servicio"}
                  </div>
                  <form className="form-grid" onSubmit={handleServiceSubmit}>
                    <label className="field">
                      <span>Codigo</span>
                      <input
                        type="text"
                        value={serviceForm.code}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            code: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={serviceForm.name}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Subtitulo</span>
                      <input
                        type="text"
                        value={serviceForm.subtitle}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            subtitle: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Descripcion</span>
                      <textarea
                        rows="3"
                        value={serviceForm.description}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Precio (Bs)</span>
                      <input
                        type="number"
                        value={serviceForm.price_bob}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            price_bob: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Duracion (min)</span>
                      <input
                        type="number"
                        value={serviceForm.duration_min}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            duration_min: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Imagen URL</span>
                      <input
                        type="text"
                        value={serviceForm.image_url}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            image_url: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={serviceForm.is_featured}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            is_featured: event.target.checked,
                          }))
                        }
                      />
                      Destacado
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={serviceForm.is_active}
                        onChange={(event) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            is_active: event.target.checked,
                          }))
                        }
                      />
                      Activo
                    </label>
                    {serviceForm.id && (
                      <div className="field">
                        <span>Disponibilidad por sucursal</span>
                        <div className="chip-grid">
                          {branches.map((branch) => {
                            const mapping = services
                              .find((item) => item.id === serviceForm.id)
                              ?.branches?.find((entry) => {
                                const branchId =
                                  entry.branch?.id || entry.branch_id;
                                return branchId === branch.id;
                              });
                            const available = mapping?.is_available || false;
                            return (
                              <label className="chip" key={branch.id}>
                                <input
                                  type="checkbox"
                                  checked={available}
                                  onChange={(event) =>
                                    handleServiceBranchToggle(
                                      services.find((item) => item.id === serviceForm.id),
                                      branch.id,
                                      event.target.checked
                                    )
                                  }
                                />
                                {branch.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {adminTab === "templates" && (
              <div className="page-grid">
                <div className="panel">
                  <div className="panel-title">Templates</div>
                  <button className="ghost" onClick={handleSyncTemplates}>
                    Sincronizar WhatsApp
                  </button>
                  <div className="table">
                    <div className="table-head">
                      <span>Nombre</span>
                      <span>Lang</span>
                      <span>Estado</span>
                      <span>Accion</span>
                    </div>
                    {templates.map((template) => (
                      <div className="table-row" key={template.id}>
                        <span>{template.name}</span>
                        <span>{template.language}</span>
                        <span>{template.is_active ? "Activo" : "Inactivo"}</span>
                        <button
                          className="ghost"
                          onClick={() =>
                            setTemplateForm({
                              id: template.id,
                              name: template.name,
                              language: template.language,
                              category: template.category || "",
                              body_preview: template.body_preview,
                              is_active: template.is_active,
                            })
                          }
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-title">
                    {templateForm.id ? "Editar template" : "Crear template"}
                  </div>
                  <form className="form-grid" onSubmit={handleTemplateSubmit}>
                    <label className="field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={templateForm.name}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Idioma</span>
                      <input
                        type="text"
                        value={templateForm.language}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            language: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Categoria</span>
                      <input
                        type="text"
                        value={templateForm.category}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Preview</span>
                      <textarea
                        rows="4"
                        value={templateForm.body_preview}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            body_preview: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={templateForm.is_active}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            is_active: event.target.checked,
                          }))
                        }
                      />
                      Activo
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {adminTab === "audit" && canAdminSettings && (
              <div className="panel">
                <div className="panel-title">Audit logs</div>
                <div className="table">
                  <div className="table-head">
                    <span>Accion</span>
                    <span>Fecha</span>
                    <span>Data</span>
                  </div>
                  {auditLogs.map((log) => (
                    <div className="table-row" key={log.id}>
                      <span>{log.action}</span>
                      <span>{formatDate(log.created_at)}</span>
                      <span className="muted">
                        {JSON.stringify(log.data_json || {})}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {pageError && <div className="error-banner">{pageError}</div>}
      </main>
    </div>
  );
}

export default App;

