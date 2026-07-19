const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

// ==========================================
// Auditly Pro v2
// Dashboard Routes
// ==========================================


router.get("/", (req, res) => {

    res.sendFile("dashboard.html", {
        root: path.join(__dirname, "../views")
    });

});



router.get("/status", (req, res) => {

    res.json({

        success: true,
        application: "Auditly Pro v2",
        status: "Running",
        version: "2.0.0"

    });

});



router.get("/health", (req, res) => {

    res.json({

        success: true,
        server: "Online",
        timestamp: new Date()

    });

});


module.exports = router;
