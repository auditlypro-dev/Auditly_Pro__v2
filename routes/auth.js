const express = require("express");
const router = express.Router();

// ==========================================
// Auditly Pro v2
// Shopify Authentication Routes
// ==========================================

// Landing page for authentication
router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Auditly Pro Authentication API"
    });
});

// Begin Shopify OAuth
router.get("/login", (req, res) => {

    const shop = req.query.shop;

    if (!shop) {
        return res.status(400).json({
            success: false,
            message: "Missing shop parameter."
        });
    }

    // OAuth logic will be added later
    res.json({
        success: true,
        message: `Authentication requested for ${shop}`,
        nextStep: "OAuth implementation coming soon."
    });

});

// OAuth callback
router.get("/callback", (req, res) => {

    res.json({
        success: true,
        message: "OAuth callback received.",
        status: "Placeholder route"
    });

});

// Logout
router.get("/logout", (req, res) => {

    res.json({
        success: true,
        message: "Successfully logged out."
    });

});

module.exports = router;
