const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

console.log("🔥 USING NEW AUTH FILE");
console.log("🔥 AUTH ROUTER LOADED");

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const HOST = process.env.HOST;
const SCOPES = process.env.SCOPES;

// --------------------------------------------------
// Test Route
// --------------------------------------------------

router.get("/hello", (req, res) => {
    res.send("HELLO FROM THE NEW AUTH FILE");
});

// --------------------------------------------------
// Install Route
// --------------------------------------------------

router.get("/install", (req, res) => {

    const shop = req.query.shop;

    if (!shop) {
        return res.status(400).send("Missing Shopify shop name");
    }

    const state = crypto.randomBytes(16).toString("hex");

    const redirectUri = `${HOST}/auth/callback`;

    const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${SHOPIFY_API_KEY}` +
        `&scope=${SCOPES}` +
        `&redirect_uri=${redirectUri}` +
        `&state=${state}`;

    res.redirect(installUrl);
});

// --------------------------------------------------
// OAuth Callback
// --------------------------------------------------

router.get("/callback", async (req, res) => {

    const shop = req.query.shop;
    const code = req.query.code;

    if (!shop || !code) {
        return res.status(400).send("Missing Shopify OAuth information");
    }

    try {

        const response = await fetch(
            `https://${shop}/admin/oauth/access_token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    client_id: SHOPIFY_API_KEY,
                    client_secret: SHOPIFY_API_SECRET,
                    code: code
                })
            }
        );

        const data = await response.json();

        console.log("SHOPIFY TOKEN RESPONSE");
        console.log(data);

        if (!data.access_token) {
            return res.status(500).json({
                error: "No access token returned from Shopify",
                details: data
            });
        }

        const shopData = {
            shop: shop,
            accessToken: data.access_token,
            installed: new Date().toISOString()
        };

        const filePath = path.join(__dirname, "../data/shops.json");

        console.log("AUTH shops.json path:", filePath);

        let shops = [];

        if (fs.existsSync(filePath)) {
            const fileContents = fs.readFileSync(filePath, "utf8").trim();

            if (fileContents.length > 0) {
                shops = JSON.parse(fileContents);
            }
        }

        console.log("Shops BEFORE save:", shops);

        const existingIndex = shops.findIndex(
            item => item.shop === shop
        );

        if (existingIndex >= 0) {
            shops[existingIndex] = shopData;
        } else {
            shops.push(shopData);
        }

        console.log("Shops AFTER save:", shops);

        fs.writeFileSync(
            filePath,
            JSON.stringify(shops, null, 2),
            "utf8"
        );

        console.log("Saved file contents:");
        console.log(fs.readFileSync(filePath, "utf8"));

        console.log("SHOP SAVED:");
        console.log(shopData);
        console.log("STORE TEST TOKEN EXISTS:", !!shopData.accessToken);

        res.send(`
            <h1>🎉 Shopify Connected!</h1>
            <p>Store:</p>
            <strong>${shop}</strong>
            <br><br>
            You can now return to Auditly Pro.
        `);

    } catch (error) {

        console.error("OAuth Error:", error);

        res.status(500).send("OAuth failed");
    }

});

// --------------------------------------------------
// Test Route
// --------------------------------------------------

router.get("/test", (req, res) => {
    res.send("AUTH ROUTER IS WORKING");
});

module.exports = router;
