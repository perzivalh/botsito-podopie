/**
 * Router principal - centraliza todas las rutas de la API
 */
const express = require("express");

// Importar routers
const publicRoutes = require("./public");
const authRoutes = require("./auth");
const webhookRoutes = require("./webhook");
const conversationsRoutes = require("./conversations");
const dashboardRoutes = require("./dashboard");
const adminRoutes = require("./admin");
const superadminRoutes = require("./superadmin");
const debugRoutes = require("./debug");

// New routes for Campaigns/Templates module
const templatesRoutes = require("./templates");
const audiencesRoutes = require("./audiences");
const contactsRoutes = require("./contacts");
const campaignsRoutes = require("./campaigns");

/**
 * Configura todas las rutas en la aplicación Express
 * @param {express.Application} app - Aplicación Express
 */
function setupRoutes(app) {
    // Rutas públicas (sin autenticación)
    app.use("/", publicRoutes);

    // Webhook de WhatsApp
    app.use("/", webhookRoutes);

    // Rutas de debug
    app.use("/debug", debugRoutes);

    // Rutas de autenticación
    app.use("/api/auth", authRoutes);

    // Rutas de API que requieren autenticación
    app.use("/api", conversationsRoutes);
    app.use("/api", dashboardRoutes);

    // Campaigns and Templates API
    app.use("/api", templatesRoutes);
    app.use("/api", audiencesRoutes);
    app.use("/api", contactsRoutes);
    app.use("/api", campaignsRoutes);

    // Rutas de administración
    app.use("/api/admin", adminRoutes);

    // Rutas de superadmin
    app.use("/api/superadmin", superadminRoutes);
}

module.exports = { setupRoutes };
