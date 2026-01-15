require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const app = express();
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  DEBUG_KEY,
  SQLITE_PATH,
} = process.env;
const PORT = process.env.PORT || 3000;

const DB_PATH = SQLITE_PATH || path.join(__dirname, "data.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("SQLite connection error", err.message);
  } else {
    console.log(`SQLite ready at ${DB_PATH}`);
  }
});
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));

async function initDb() {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_id TEXT NOT NULL,
      name TEXT NOT NULL,
      reason TEXT NOT NULL,
      date_pref TEXT NOT NULL,
      time_pref TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
  await dbRun(
    `CREATE TABLE IF NOT EXISTS payment_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_id TEXT NOT NULL,
      identifier TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
}

void initDb().catch((err) => {
  console.error("SQLite init error", err.message || err);
});

const processedMessageIds = new Set();
const processedQueue = [];

const STATES = {
  NEW: "NEW",
  WAIT_NAME: "WAIT_NAME",
  WAIT_REASON: "WAIT_REASON",
  WAIT_DAY: "WAIT_DAY",
  WAIT_TIME: "WAIT_TIME",
  WAIT_CONFIRM: "WAIT_CONFIRM",
  WAIT_PAYMENT_ID: "WAIT_PAYMENT_ID",
};

const MENU_ACTIONS = {
  APPOINTMENT: "MENU_APPOINTMENT",
  PAYMENTS: "MENU_PAYMENTS",
  LOCATION: "MENU_LOCATION",
  SERVICES: "MENU_SERVICES",
};

const DAY_OPTIONS = {
  TODAY: "DAY_TODAY",
  TOMORROW: "DAY_TOMORROW",
  WEEK: "DAY_WEEK",
};

const TIME_OPTIONS = {
  MORNING: "TIME_MORNING",
  AFTERNOON: "TIME_AFTERNOON",
  NIGHT: "TIME_NIGHT",
};

const CONFIRM_ACTIONS = {
  CONFIRM: "CONFIRM_APPOINTMENT",
  CANCEL: "CANCEL_APPOINTMENT",
};

const MAIN_MENU_OPTIONS = [
  { id: MENU_ACTIONS.APPOINTMENT, title: "📅 Agendar cita" },
  { id: MENU_ACTIONS.PAYMENTS, title: "💰 Pagos y pendientes" },
  { id: MENU_ACTIONS.LOCATION, title: "📍 Ubicación y horarios" },
  { id: MENU_ACTIONS.SERVICES, title: "👨‍⚕️ Servicios y precios" },
];

const DAY_ROWS = [
  { id: DAY_OPTIONS.TODAY, title: "Hoy" },
  { id: DAY_OPTIONS.TOMORROW, title: "Mañana" },
  { id: DAY_OPTIONS.WEEK, title: "Esta semana" },
];

const TIME_BUTTONS = [
  { id: TIME_OPTIONS.MORNING, title: "Mañana" },
  { id: TIME_OPTIONS.AFTERNOON, title: "Tarde" },
  { id: TIME_OPTIONS.NIGHT, title: "Noche" },
];

const CONFIRM_BUTTONS = [
  { id: CONFIRM_ACTIONS.CONFIRM, title: "Confirmar" },
  { id: CONFIRM_ACTIONS.CANCEL, title: "Cancelar" },
];

const WELCOME_TEXT =
  "👋 Hola, soy el asistente de Podopie. ¿Qué querés hacer?";
const LOCATION_TEXT =
  "📍 Estamos en Podopie (placeholder). Horarios: Lunes a Viernes de 09:00 a 19:00. Sábados 09:00 a 13:00.";
const SERVICES_TEXT =
  "👨‍⚕️ Servicios y precios (referencial):\n- Consulta inicial\n- Tratamiento de uña encarnada\n- Hongos y micosis\n- Callos y durezas\n- Control y seguimiento";

const userStates = new Map();

function normalizeText(text) {
  return (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUserState(waId) {
  if (!userStates.has(waId)) {
    userStates.set(waId, {
      state: STATES.NEW,
      data: {},
      updatedAt: new Date().toISOString(),
    });
  }
  return userStates.get(waId);
}

function setUserState(waId, state, data) {
  userStates.set(waId, {
    state,
    data,
    updatedAt: new Date().toISOString(),
  });
}

function resetUserState(waId) {
  setUserState(waId, STATES.NEW, {});
}

function isDuplicateMessage(messageId) {
  if (!messageId) {
    return false;
  }
  if (processedMessageIds.has(messageId)) {
    return true;
  }
  processedMessageIds.add(messageId);
  processedQueue.push(messageId);
  if (processedQueue.length > 200) {
    const oldest = processedQueue.shift();
    processedMessageIds.delete(oldest);
  }
  return false;
}

async function sendWhatsAppMessage(payload) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID");
    return;
  }

  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  try {
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status || data) {
      console.error("WhatsApp API error", status, data);
      return;
    }
    console.error("WhatsApp API error", error.message || error);
  }
}

async function sendText(to, text) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

async function sendButtons(to, text, buttons) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: buttons.map((button) => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      },
    },
  });
}

async function sendList(to, header, body, buttonText, sections) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      action: {
        button: buttonText,
        sections: sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
          })),
        })),
      },
    },
  });
}

async function sendMainMenu(to) {
  if (MAIN_MENU_OPTIONS.length <= 3) {
    await sendButtons(to, WELCOME_TEXT, MAIN_MENU_OPTIONS);
    return;
  }

  await sendList(to, "Menu principal", WELCOME_TEXT, "Ver opciones", [
    {
      title: "Opciones",
      rows: MAIN_MENU_OPTIONS,
    },
  ]);
}

async function sendDayList(to) {
  await sendList(to, "Dia preferido", "¿Qué día preferís?", "Elegir", [
    {
      title: "Opciones",
      rows: DAY_ROWS,
    },
  ]);
}

async function sendTimeButtons(to) {
  await sendButtons(to, "¿Qué rango horario preferís?", TIME_BUTTONS);
}

async function sendConfirmButtons(to, data) {
  const summary =
    `Resumen:\n` +
    `Nombre: ${data.name}\n` +
    `Motivo: ${data.reason}\n` +
    `Día: ${data.datePref}\n` +
    `Horario: ${data.timePref}\n\n` +
    `¿Confirmamos?`;
  await sendButtons(to, summary, CONFIRM_BUTTONS);
}

function parseIncoming(message) {
  if (message.type === "text") {
    return { kind: "text", text: message.text?.body || "" };
  }

  if (message.type === "interactive") {
    const interactive = message.interactive || {};
    if (interactive.type === "button_reply") {
      return {
        kind: "interactive",
        id: interactive.button_reply?.id,
        title: interactive.button_reply?.title,
      };
    }
    if (interactive.type === "list_reply") {
      return {
        kind: "interactive",
        id: interactive.list_reply?.id,
        title: interactive.list_reply?.title,
      };
    }
  }

  return { kind: "unknown" };
}

function logIncomingMessage(message, incoming) {
  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const payload =
    incoming.kind === "text"
      ? incoming.text
      : `${incoming.id || ""}${incoming.title ? ` | ${incoming.title}` : ""}`;
  console.log(
    `[WA] ${timestamp} wa_id=${message.from} message_id=${message.id} type=${message.type} payload="${payload}"`
  );
}

function mapDayFromText(text) {
  if (text.includes("hoy")) {
    return DAY_OPTIONS.TODAY;
  }
  if (text.includes("manana")) {
    return DAY_OPTIONS.TOMORROW;
  }
  if (text.includes("semana")) {
    return DAY_OPTIONS.WEEK;
  }
  return null;
}

function mapTimeFromText(text) {
  if (text.includes("manana")) {
    return TIME_OPTIONS.MORNING;
  }
  if (text.includes("tarde")) {
    return TIME_OPTIONS.AFTERNOON;
  }
  if (text.includes("noche")) {
    return TIME_OPTIONS.NIGHT;
  }
  return null;
}

async function handleMenuAction(waId, actionId) {
  if (actionId === MENU_ACTIONS.APPOINTMENT) {
    setUserState(waId, STATES.WAIT_NAME, {});
    await sendText(waId, "Perfecto. ¿Cuál es tu nombre completo?");
    return;
  }

  if (actionId === MENU_ACTIONS.PAYMENTS) {
    setUserState(waId, STATES.WAIT_PAYMENT_ID, {});
    await sendText(
      waId,
      "Para ver pagos y pendientes necesitamos validar tu identidad. Escribí tu CI o tu NIT."
    );
    return;
  }

  if (actionId === MENU_ACTIONS.LOCATION) {
    resetUserState(waId);
    await sendText(waId, LOCATION_TEXT);
    await sendMainMenu(waId);
    return;
  }

  if (actionId === MENU_ACTIONS.SERVICES) {
    resetUserState(waId);
    await sendText(waId, SERVICES_TEXT);
    await sendMainMenu(waId);
  }
}

async function handleDaySelection(waId, dayId, data) {
  const dayLabel =
    DAY_ROWS.find((row) => row.id === dayId)?.title || "Sin definir";
  setUserState(waId, STATES.WAIT_TIME, { ...data, datePref: dayLabel });
  await sendTimeButtons(waId);
}

async function handleTimeSelection(waId, timeId, data) {
  const timeLabel =
    TIME_BUTTONS.find((row) => row.id === timeId)?.title || "Sin definir";
  setUserState(waId, STATES.WAIT_CONFIRM, { ...data, timePref: timeLabel });
  await sendConfirmButtons(waId, { ...data, timePref: timeLabel });
}

async function handleConfirmSelection(waId, confirmId, data) {
  if (confirmId === CONFIRM_ACTIONS.CANCEL) {
    resetUserState(waId);
    await sendText(waId, "Listo, cancelado.");
    await sendMainMenu(waId);
    return;
  }

  if (confirmId === CONFIRM_ACTIONS.CONFIRM) {
    const createdAt = new Date().toISOString();
    await dbRun(
      `INSERT INTO leads (wa_id, name, reason, date_pref, time_pref, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        waId,
        data.name || "",
        data.reason || "",
        data.datePref || "",
        data.timePref || "",
        createdAt,
      ]
    );
    resetUserState(waId);
    await sendText(
      waId,
      "✅ Listo, recibimos tu solicitud. En breve te confirmamos por este WhatsApp."
    );
    await sendMainMenu(waId);
  }
}

async function handleTextFlow(waId, text) {
  const normalized = normalizeText(text);
  const current = getUserState(waId);

  if (normalized === "menu" || normalized === "0") {
    resetUserState(waId);
    await sendMainMenu(waId);
    return;
  }

  if (normalized === "cancelar") {
    resetUserState(waId);
    await sendText(waId, "Listo, cancelado.");
    await sendMainMenu(waId);
    return;
  }

  if (current.state === STATES.NEW) {
    await sendMainMenu(waId);
    return;
  }

  if (current.state === STATES.WAIT_NAME) {
    const name = text.trim();
    if (!name) {
      await sendText(waId, "Necesito tu nombre completo para continuar.");
      return;
    }
    setUserState(waId, STATES.WAIT_REASON, { name });
    await sendText(
      waId,
      "Gracias. ¿Cuál es el motivo de la consulta? (uña encarnada, hongos, callos, etc.)"
    );
    return;
  }

  if (current.state === STATES.WAIT_REASON) {
    const reason = text.trim();
    if (!reason) {
      await sendText(waId, "Contame brevemente el motivo de la consulta.");
      return;
    }
    setUserState(waId, STATES.WAIT_DAY, { ...current.data, reason });
    await sendDayList(waId);
    return;
  }

  if (current.state === STATES.WAIT_DAY) {
    const dayId = mapDayFromText(normalized);
    if (!dayId) {
      await sendDayList(waId);
      return;
    }
    await handleDaySelection(waId, dayId, current.data);
    return;
  }

  if (current.state === STATES.WAIT_TIME) {
    const timeId = mapTimeFromText(normalized);
    if (!timeId) {
      await sendTimeButtons(waId);
      return;
    }
    await handleTimeSelection(waId, timeId, current.data);
    return;
  }

  if (current.state === STATES.WAIT_CONFIRM) {
    if (normalized.includes("confirm")) {
      await handleConfirmSelection(
        waId,
        CONFIRM_ACTIONS.CONFIRM,
        current.data
      );
      return;
    }
    if (normalized.includes("cancel")) {
      await handleConfirmSelection(
        waId,
        CONFIRM_ACTIONS.CANCEL,
        current.data
      );
      return;
    }
    await sendConfirmButtons(waId, current.data);
    return;
  }

  if (current.state === STATES.WAIT_PAYMENT_ID) {
    const identifier = text.trim();
    if (!identifier) {
      await sendText(waId, "Escribí tu CI o tu NIT para continuar.");
      return;
    }
    const createdAt = new Date().toISOString();
    await dbRun(
      `INSERT INTO payment_requests (wa_id, identifier, created_at)
       VALUES (?, ?, ?)`,
      [waId, identifier, createdAt]
    );
    resetUserState(waId);
    await sendText(waId, "✅ Recibido, lo revisamos.");
    await sendMainMenu(waId);
  }
}

async function handleInteractiveFlow(waId, selectionId) {
  if (!selectionId) {
    return;
  }

  if (Object.values(MENU_ACTIONS).includes(selectionId)) {
    await handleMenuAction(waId, selectionId);
    return;
  }

  const current = getUserState(waId);

  if (current.state === STATES.WAIT_DAY) {
    if (Object.values(DAY_OPTIONS).includes(selectionId)) {
      await handleDaySelection(waId, selectionId, current.data);
      return;
    }
  }

  if (current.state === STATES.WAIT_TIME) {
    if (Object.values(TIME_OPTIONS).includes(selectionId)) {
      await handleTimeSelection(waId, selectionId, current.data);
      return;
    }
  }

  if (current.state === STATES.WAIT_CONFIRM) {
    if (Object.values(CONFIRM_ACTIONS).includes(selectionId)) {
      await handleConfirmSelection(waId, selectionId, current.data);
      return;
    }
  }

  await sendMainMenu(waId);
}

async function handleIncomingMessage(message) {
  try {
    const incoming = parseIncoming(message);
    logIncomingMessage(message, incoming);

    if (isDuplicateMessage(message.id)) {
      console.log(`Duplicate message ignored: ${message.id}`);
      return;
    }

    if (incoming.kind === "text") {
      await handleTextFlow(message.from, incoming.text || "");
      return;
    }

    if (incoming.kind === "interactive") {
      await handleInteractiveFlow(message.from, incoming.id);
    }
  } catch (error) {
    console.error("Message handling error", error.message || error);
  }
}

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`WEBHOOK HIT ${timestamp}`);

  res.status(200).send("EVENT_RECEIVED");

  const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  for (const message of messages) {
    if (!message) {
      continue;
    }
    if (message.type !== "text" && message.type !== "interactive") {
      continue;
    }
    void handleIncomingMessage(message);
  }
});

app.get("/debug/state", async (req, res) => {
  const providedKey = req.query.key || req.headers["x-debug-key"];
  if (!DEBUG_KEY || providedKey !== DEBUG_KEY) {
    return res.sendStatus(403);
  }

  try {
    const states = Array.from(userStates.entries()).map(([waId, data]) => ({
      wa_id: waId,
      state: data.state,
      data: data.data,
      updatedAt: data.updatedAt,
    }));

    const leads = await dbAll(
      "SELECT * FROM leads ORDER BY created_at DESC LIMIT 200"
    );
    const paymentRequests = await dbAll(
      "SELECT * FROM payment_requests ORDER BY created_at DESC LIMIT 200"
    );

    return res.json({ states, leads, paymentRequests });
  } catch (error) {
    console.error("Debug state error", error.message || error);
    return res.sendStatus(500);
  }
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.type === "entity.parse.failed") {
    const timestamp = new Date().toISOString();
    console.error(`WEBHOOK PARSE ERROR ${timestamp}`, err.message);
    console.error(req.rawBody || "");
    return res.status(400).send("INVALID_JSON");
  }

  return next(err);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
