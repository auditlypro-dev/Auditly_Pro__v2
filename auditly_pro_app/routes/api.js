const express = require("express");
const router = express.Router();

console.log("🔥 API ROUTES FILE LOADED");

const shopifyService = require("../services/shopify");

// ==========================================
// Test API
// ==========================================

router.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Auditly Pro API"
    });

});

// ==========================================
// Shopify Store Information
// ==========================================

router.get("/store", async (req, res) => {

    try {

        const shop = req.query.shop;
        const accessToken = req.query.token;

        if (!shop || !accessToken) {

            return res.status(400).json({
                success: false,
                message: "Missing shop or token"
            });

        }

        const storeInfo = await shopifyService.getStoreInfo(
            shop,
            accessToken
        );

        res.json({
            success: true,
            store: storeInfo
        });

    } catch (error) {

        console.error("STORE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve store information.",
            error: error.message
        });

    }

});

// ==========================================
// Start Audit
// ==========================================

router.post("/audit", (req, res) => {

    res.json({
        success: true,
        auditStatus: "Started",
        message: "Store audit initiated."
    });

});

// ==========================================
// Audit Results
// ==========================================

router.get("/results", (req, res) => {

    res.json({
        success: true,
        results: []
    });

});

module.exports = router;
