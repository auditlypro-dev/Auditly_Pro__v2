const express = require("express");
const router = express.Router();

const path = require("path");

console.log("🔥 DASHBOARD ROUTER LOADED");

// ==========================================
// Dashboard Home
// GET /dashboard
// ==========================================

router.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../views/dashboard.html"
        )
    );

});

// ==========================================
// Dashboard Status
// GET /dashboard/status
// ==========================================

router.get("/status", (req, res) => {

    res.json({

        success: true,

        application:
            "Auditly Pro v2",

        status:
            "Running",

        version:
            "2.0.0"

    });

});

// ==========================================
// Dashboard Health
// GET /dashboard/health
// ==========================================

router.get("/health", (req, res) => {

    res.json({

        success: true,

        server:
            "Online",

        timestamp:
            new Date().toISOString()

    });

});

// ==========================================
// EXPORT
// ==========================================

module.exports = router;
