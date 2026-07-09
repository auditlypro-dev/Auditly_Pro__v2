const express = require("express");
const router = express.Router();

// ==========================================
// Auditly Pro v2
// API Routes
// ==========================================

router.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Auditly Pro API"
    });

});


router.post("/audit", (req, res) => {

    res.json({
        success: true,
        auditStatus: "Started",
        message: "Store audit initiated."
    });

});


router.get("/results", (req, res) => {

    res.json({
        success: true,
        results: []
    });

});


module.exports = router;
