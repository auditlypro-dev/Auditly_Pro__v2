const express = require("express");
const router = express.Router();

// ==========================================
// Auditly Pro v2
// Billing Routes
// ==========================================

router.get("/", (req, res) => {

    res.json({
        success: true,
        plan: "Developer",
        price: "$27/month"
    });

});


router.post("/upgrade", (req, res) => {

    res.json({
        success: true,
        message: "Billing integration coming soon."
    });

});


module.exports = router;
