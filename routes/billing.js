const express = require("express");
const router = express.Router();

// ==========================================
// Auditly Pro v2
// Billing Routes
// ==========================================

// Billing Home
router.get("/", (req, res) => {

    res.json({
        success: true,
        subscription: "Developer",
        monthlyPrice: "$27.00"
    });

});

// Current Plan
router.get("/plan", (req, res) => {

    res.json({
        success: true,
        plan: "Developer",
        status: "Active"
    });

});

// Upgrade Subscription
router.post("/upgrade", (req, res) => {

    res.json({
        success: true,
        message: "Billing integration coming soon."
    });

});

module.exports = router;
