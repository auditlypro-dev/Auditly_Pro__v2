const express = require("express");
const router = express.Router();

// ==========================================
// Auditly Pro v2
// Dashboard Routes
// ==========================================

// Dashboard Home
router.get("/", (req, res) => {

    res.sendFile("dashboard.html", {
        root: "./views"
    });

});

// Dashboard Status
router.get("/status", (req, res) => {

    res.json({
        success: true,
        application: "Auditly Pro v2",
        status: "Running",
        version: "2.0.0"
    });

});

// Health Check
router.get("/health", (req, res) => {

    res.json({
        success: true,
        server: "Online",
        timestamp: new Date()
    });

});

module.exports = router;