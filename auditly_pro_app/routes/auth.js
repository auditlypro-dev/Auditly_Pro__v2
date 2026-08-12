const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

console.log("🔥 USING NEW AUTH FILE - EXPIRING OFFLINE TOKENS");
console.log("🔥 AUTH ROUTER LOADED");

// ==================================================
// ENVIRONMENT VARIABLES
// ==================================================

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const HOST = process.env.HOST;
const SCOPES = process.env.SCOPES;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ==================================================
// SUPABASE
// ==================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==================================================
// BASIC VALIDATION
// ==================================================

function isValidShop(shop) {
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

// ==================================================
// HMAC VALIDATION
// ==================================================

function validateShopifyHmac(query) {

    const { hmac, ...params } = query;

    if (!hmac) {
        return false;
    }

    const message = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join("&");

    const generatedHmac = crypto
        .createHmac("sha256", SHOPIFY_API_SECRET)
        .update(message)
        .digest("hex");

    try {
        return crypto.timingSafeEqual(
            Buffer.from(generatedHmac, "utf8"),
            Buffer.from(hmac, "utf8")
        );
    } catch {
        return false;
    }
}

// ==================================================
// TEST ROUTE
// ==================================================

router.get("/hello", (req, res) => {
    res.send("HELLO FROM THE NEW AUTH FILE");
});

// ==================================================
// INSTALL ROUTE
// ==================================================

router.get("/install", (req, res) => {

    const shop = req.query.shop;

    if (!shop) {
        return res.status(400).send(
            "Missing Shopify shop name"
        );
    }

    if (!isValidShop(shop)) {
        return res.status(400).send(
            "Invalid Shopify shop name"
        );
    }

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !HOST || !SCOPES) {
        console.error(
            "❌ Missing Shopify environment variables"
        );

        return res.status(500).send(
            "Shopify configuration is incomplete"
        );
    }

    // State protects the OAuth installation request.
    const state = crypto
        .randomBytes(16)
        .toString("hex");

    const redirectUri =
        `${HOST}/auth/callback`;

    const params = new URLSearchParams({
        client_id: SHOPIFY_API_KEY,
        scope: SCOPES,
        redirect_uri: redirectUri,
        state: state
    });

    const installUrl =
        `https://${shop}/admin/oauth/authorize?${params.toString()}`;

    console.log(
        "🚀 Starting Shopify installation for:",
        shop
    );

    res.redirect(installUrl);
});

// ==================================================
// OAUTH CALLBACK
// ==================================================

router.get("/callback", async (req, res) => {

    const shop = req.query.shop;
    const code = req.query.code;

    if (!shop || !code) {
        return res.status(400).send(
            "Missing Shopify OAuth information"
        );
    }

    if (!isValidShop(shop)) {
        return res.status(400).send(
            "Invalid Shopify shop name"
        );
    }

    // Validate Shopify HMAC.
    if (!validateShopifyHmac(req.query)) {

        console.error(
            "❌ Shopify HMAC validation failed"
        );

        return res.status(400).send(
            "Shopify OAuth validation failed"
        );
    }

    try {

        console.log(
            "🔐 Exchanging Shopify authorization code..."
        );

        // ==================================================
        // EXCHANGE CODE FOR EXPIRING OFFLINE TOKEN
        // ==================================================

        const tokenResponse = await fetch(
            `https://${shop}/admin/oauth/access_token`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Accept":
                        "application/json"
                },

                body: new URLSearchParams({
                    client_id: SHOPIFY_API_KEY,
                    client_secret: SHOPIFY_API_SECRET,
                    code: code,
                    expiring: "1"
                }).toString()
            }
        );

        const tokenData = await tokenResponse.json();

        console.log(
            "SHOPIFY TOKEN RESPONSE RECEIVED"
        );

        if (!tokenResponse.ok) {

            console.error(
                "❌ Shopify token exchange failed:",
                tokenData
            );

            return res.status(500).json({
                error: "Shopify token exchange failed",
                details: tokenData
            });
        }

        if (!tokenData.access_token) {

            console.error(
                "❌ Shopify did not return an access token"
            );

            return res.status(500).json({
                error: "No access token returned from Shopify",
                details: tokenData
            });
        }

        if (!tokenData.refresh_token) {

            console.error(
                "❌ Shopify did not return a refresh token"
            );

            return res.status(500).json({
                error: "No refresh token returned from Shopify",
                details: tokenData
            });
        }

        // ==================================================
        // CALCULATE EXPIRATION TIMES
        // ==================================================

        const now = Date.now();

        const expiresAt = new Date(
            now + (tokenData.expires_in * 1000)
        ).toISOString();

        const refreshTokenExpiresAt = new Date(
            now +
            (tokenData.refresh_token_expires_in * 1000)
        ).toISOString();

        // ==================================================
        // SAVE TO SUPABASE
        // ==================================================

        const shopRecord = {
            shop: shop,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            refresh_token_expires_at:
                refreshTokenExpiresAt,
            updated_at: new Date().toISOString()
        };

        console.log(
            "💾 Saving Shopify installation to Supabase..."
        );

        const { data, error } = await supabase
            .from("shops")
            .upsert(
                shopRecord,
                {
                    onConflict: "shop"
                }
            )
            .select();

        if (error) {

            console.error(
                "❌ Supabase save error:",
                error
            );

            return res.status(500).json({
                error: "Unable to save Shopify store",
                details: error.message
            });
        }

        console.log(
            "✅ SHOP SAVED TO SUPABASE"
        );

        console.log({
            shop: shop,
            tokenSaved: true,
            refreshTokenSaved: true,
            expiresAt: expiresAt,
            refreshTokenExpiresAt:
                refreshTokenExpiresAt
        });

        // ==================================================
        // SUCCESS PAGE
        // ==================================================

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Auditly Pro - Shopify Connected</title>
                <meta name="viewport"
                    content="width=device-width, initial-scale=1">
            </head>

            <body style="
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
            ">

                <h1>🎉 Shopify Connected!</h1>

                <p>Store:</p>

                <strong>${shop}</strong>

                <br><br>

                <p>
                    Your Shopify connection has been
                    securely saved.
                </p>

                <p>
                    You can now return to Auditly Pro.
                </p>

            </body>
            </html>
        `);

    } catch (error) {

        console.error(
            "❌ OAuth Error:",
            error
        );

        res.status(500).json({
            error: "OAuth failed",
            details: error.message
        });
    }
});

// ==================================================
// TEST ROUTE
// ==================================================

router.get("/test", (req, res) => {

    res.send(
        "AUTH ROUTER IS WORKING"
    );

});

// ==================================================
// EXPORT
// ==================================================

module.exports = router;
