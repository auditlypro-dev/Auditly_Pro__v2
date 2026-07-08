const express = require("express");
const router = express.Router();

// ==========================================
// Auditly Pro v2
// API Routes
// ==========================================

// API Home
router.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Auditly Pro API"
    });

});

// Run Store Audit
router.post("/audit", (req, res) => {

    res.json({
        success: true,
        auditStatus: "Started",
        message: "Store audit has been initiated."
    });

});

// Audit Results
router.get("/results", (req, res) => {

    res.json({
        success: true,
        completed: false,
        results: []
    });

});

// AI Recommendations
router.get("/recommendations", (req, res) => {

    res.json({
        success: true,
        recommendations: []
    });

});

module.exports = router;
