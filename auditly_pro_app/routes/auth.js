const express = require("express");
const router = express.Router();

const crypto = require("crypto");

const {
    saveShop
} = require("../services/supabase");

console.log("🔥 USING EXPIRING TOKEN AUTH FILE");
console.log("🔥 AUTH ROUTER LOADED");

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const SHOPIFY_API_KEY =
    process.env.SHOPIFY_API_KEY;

const SHOPIFY_API_SECRET =
    process.env.SHOPIFY_API_SECRET;

const HOST =
    process.env.HOST;

const SCOPES =
    process.env.SCOPES;

// ==========================================
// Temporary OAuth State Storage
// ==========================================

const oauthStates = new Map();

// ==========================================
// Test Route
// ==========================================

router.get("/hello", (req, res) => {

    res.send(
        "HELLO FROM EXPIRING TOKEN AUTH FILE"
    );

});

// ==========================================
// Shopify Install
// ==========================================

router.get("/install", (req, res) => {

    const shop = req.query.shop;

    if (!shop) {

        return res.status(400).send(
            "Missing Shopify shop name"
        );

    }

    const state =
        crypto.randomBytes(16).toString("hex");

    oauthStates.set(state, {
        shop: shop,
        created: Date.now()
    });

    const redirectUri =
        `${HOST}/auth/callback`;

    const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${encodeURIComponent(SHOPIFY_API_KEY)}` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}`;

    console.log(
        "SHOPIFY INSTALL URL CREATED FOR:",
        shop
    );

    res.redirect(installUrl);

});

// ==========================================
// OAuth Callback
// ==========================================

router.get("/callback", async (req, res) => {

    const {
        shop,
        code,
        state
    } = req.query;

    if (!shop || !code || !state) {

        return res.status(400).send(
            "Missing Shopify OAuth information"
        );

    }

    // ======================================
    // Verify OAuth State
    // ======================================

    const savedState =
        oauthStates.get(state);

    if (!savedState) {

        return res.status(403).send(
            "Invalid or expired OAuth state"
        );

    }

    // Remove state after successful validation
    oauthStates.delete(state);

    // ======================================
    // Exchange OAuth Code
    // ======================================

    try {

        console.log(
            "🔄 Exchanging Shopify OAuth code..."
        );

        const response = await fetch(
            `https://${shop}/admin/oauth/access_token`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify({

                    client_id:
                        SHOPIFY_API_KEY,

                    client_secret:
                        SHOPIFY_API_SECRET,

                    code:
                        code

                })
            }
        );

        const tokenData =
            await response.json();

        console.log(
            "SHOPIFY TOKEN RESPONSE RECEIVED"
        );

        // ==================================
        // Check Shopify Response
        // ==================================

        if (
            !response.ok ||
            !tokenData.access_token
        ) {

            console.error(
                "❌ SHOPIFY TOKEN ERROR:",
                tokenData
            );

            return res.status(500).json({

                error:
                    "Unable to obtain Shopify access token",

                details:
                    tokenData

            });

        }

        // ==================================
        // Extract Token Information
        // ==================================

        const accessToken =
            tokenData.access_token;

        const refreshToken =
            tokenData.refresh_token;

        // ==================================
        // Verify Expiring Token Response
        // ==================================

        if (!refreshToken) {

            console.error(
                "❌ Shopify did not return a refresh token."
            );

            return res.status(500).json({

                error:
                    "Shopify did not return an expiring offline token.",

                details:
                    "The app installation did not return a refresh_token. Check the Shopify app authentication configuration."

            });

        }

        if (!tokenData.expires_in) {

            console.error(
                "❌ Shopify did not return expires_in."
            );

            return res.status(500).json({

                error:
                    "Shopify did not return token expiration information.",

                details:
                    "An expiring offline token was expected."

            });

        }

        // ==================================
        // Calculate Expiration
        // ==================================

        const now =
            Date.now();

        const expiresAt =
            new Date(
                now +
                (tokenData.expires_in * 1000)
            ).toISOString();

        let refreshTokenExpiresAt = null;

        if (
            tokenData.refresh_token_expires_in
        ) {

            refreshTokenExpiresAt =
                new Date(
                    now +
                    (
                        tokenData.refresh_token_expires_in *
                        1000
                    )
                ).toISOString();

        }

        console.log(
            "🔐 Shopify expiring token received"
        );

        console.log({
            shop: shop,
            accessTokenReceived:
                !!accessToken,
            refreshTokenReceived:
                !!refreshToken,
            expiresAt:
                expiresAt,
            refreshTokenExpiresAt:
                refreshTokenExpiresAt
        });

        // ==================================
        // Save Everything to Supabase
        // ==================================

        console.log(
            "💾 SAVING SHOP TO SUPABASE:",
            shop
        );

        await saveShop(
            shop,
            accessToken,
            refreshToken,
            expiresAt,
            refreshTokenExpiresAt
        );

        console.log(
            "✅ SHOP SAVED TO SUPABASE:",
            shop
        );

        // ==================================
        // Success
        // ==================================

        res.send(`

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <title>Auditly Pro Connected</title>

            </head>

            <body>

                <h1>
                    🎉 Auditly Pro Connected!
                </h1>

                <p>
                    Store:
                </p>

                <strong>
                    ${shop}
                </strong>

                <br><br>

                <p>
                    Your Shopify store is connected
                    and securely saved.
                </p>

                <p>
                    You can now return to
                    Auditly Pro.
                </p>

            </body>

            </html>

        `);

    } catch (error) {

        console.error(
            "❌ OAuth / Supabase ERROR:",
            error
        );

        res.status(500).send(`

            <h1>
                OAuth connection failed.
            </h1>

            <p>
                Auditly Pro could not complete
                the Shopify connection.
            </p>

            <p>
                Check the Render logs for details.
            </p>

        `);

    }

});

// ==========================================
// Auth Test
// ==========================================

router.get("/test", (req, res) => {

    res.json({

        success: true,

        message:
            "Auditly Pro authentication system is working.",

        architecture:
            "Shopify OAuth → Supabase",

        expiringTokens:
            true

    });

});

// ==========================================
// Export
// ==========================================

module.exports = router;
