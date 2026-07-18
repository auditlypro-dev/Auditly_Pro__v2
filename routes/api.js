const express = require("express");
const router = express.Router();

console.log("🔥 API ROUTES FILE LOADED");

const shopifyService = require("../services/shopify");


// ==========================================
// Auditly Pro v2
// API Routes
// ==========================================


// Test API

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


    res.json(storeInfo);

});


// ==========================================
// Audit Starter
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
