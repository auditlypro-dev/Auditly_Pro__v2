const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Shopify API configuration
const SHOPIFY_API_VERSION = "2025-01";

// Location of saved Shopify stores/tokens
const shopsFile = path.join(__dirname, "../data/shops.json");


// GET /api/store?shop=store-name.myshopify.com
router.get("/store", async (req, res) => {
    try {
        const shop = req.query.shop;

        if (!shop) {
            return res.status(400).json({
                error: "Missing shop parameter"
            });
        }

        console.log("🔎 Looking for shop:", shop);


        // Make sure shops.json exists
        if (!fs.existsSync(shopsFile)) {
            return res.status(404).json({
                error: "shops.json not found"
            });
        }


        // Read saved shops
        const shopsData = JSON.parse(
            fs.readFileSync(shopsFile, "utf8")
        );


        // Find matching shop
        const store = shopsData.find(
            item => item.shop === shop
        );


        if (!store) {
            return res.status(404).json({
                error: "Shop not found",
                shop
            });
        }


        if (!store.accessToken) {
            return res.status(401).json({
                error: "No access token saved for this shop"
            });
        }


        console.log("✅ Shop found");
        console.log("🔑 Access token loaded");


        // Call Shopify Admin API
        const response = await axios.get(
            `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
            {
                headers: {
                    "X-Shopify-Access-Token": store.accessToken,
                    "Content-Type": "application/json"
                }
            }
        );


        console.log("✅ Shopify data received");


        // Return store information
        res.json({
            success: true,
            shop: response.data.shop
        });


    } catch (error) {

        console.error(
            "❌ Shopify API Error:",
            error.response?.data || error.message
        );


        res.status(500).json({
            error: "Unable to retrieve Shopify store data",
            details:
                error.response?.data || error.message
        });
    }
});


module.exports = router;
