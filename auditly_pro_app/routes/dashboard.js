const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

// ==========================================
// Auditly Pro v2
// Dashboard Routes
// ==========================================

router.get("/", (req, res) => {

    const filePath = path.join(__dirname, "../data/shops.json");

    let connected = false;
    let shop = null;

    if (fs.existsSync(filePath)) {

        const shops = JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );

        if (shops.length > 0) {
            connected = true;
            shop = shops[0].shop;
        }

    }

    res.sendFile("dashboard.html", {
        root: "./views"
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
