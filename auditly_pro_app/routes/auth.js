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
// Shopify Install Route
// ==========================================

router.get("/install", (req, res) => {

    const shop = req.query.shop;

    if (!shop) {

        return res
            .status(400)
            .send("Missing Shopify shop name");

    }

    // Create secure OAuth state
    const state =
        crypto.randomBytes(16).toString("hex");

    oauthStates.set(state, {
        shop: shop,
        created: Date.now()
    });

    const redirectUri =
        `${HOST}/auth/callback`;

    /*
     * IMPORTANT:
     *
     * We intentionally do NOT include:
     *
     * grant_options[]=per-user
     *
     * because Auditly Pro needs an OFFLINE token
     * for server-to-server Shopify API requests.
     */

    const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${encodeURIComponent(
            SHOPIFY_API_KEY
        )}` +
        `&scope=${encodeURIComponent(
            SCOPES
        )}` +
        `&redirect_uri=${encodeURIComponent(
            redirectUri
        )}` +
        `&state=${encodeURIComponent(
            state
        )}`;

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

    // ======================================
    // Validate OAuth Parameters
    // ======================================

    if (!shop || !code || !state) {

        return res
            .status(400)
            .send(
                "Missing Shopify OAuth information"
            );

    }

    // ======================================
    // Verify OAuth State
    // ======================================

    const savedState =
        oauthStates.get(state);

    if (!savedState) {

        return res
            .status(403)
            .send(
                "Invalid or expired OAuth state"
            );

    }

    // State can only be used once
    oauthStates.delete(state);

    try {

        console.log(
            "🔄 Exchanging Shopify OAuth code..."
        );

        // ==================================
        // Exchange Authorization Code
        // ==================================

        /*
         * Shopify requires the authorization-code
         * exchange to be form-urlencoded.
         *
         * expiring=1 requests an EXPIRING
         * OFFLINE access token.
         */

        const tokenBody =
            new URLSearchParams({

                client_id:
                    SHOPIFY_API_KEY,

                client_secret:
                    SHOPIFY_API_SECRET,

                code:
                    code,

                expiring:
                    "1"

            }).toString();

        const response = await fetch(

            `https://${shop}/admin/oauth/access_token`,

            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded",

                    "Accept":
                        "application/json"

                },

                body:
                    tokenBody

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

        if (!response.ok) {

            console.error(
                "❌ SHOPIFY TOKEN ERROR:",
                tokenData
            );

            return res
                .status(500)
                .json({

                    error:
                        "Shopify token exchange failed",

                    details:
                        tokenData

                });

        }

        // ==================================
        // Check Access Token
        // ==================================

        if (!tokenData.access_token) {

            console.error(
                "❌ NO ACCESS TOKEN RETURNED:",
                tokenData
            );

            return res
                .status(500)
                .json({

                    error:
                        "Shopify did not return an access token",

                    details:
                        tokenData

                });

        }

        // ==================================
        // Check Refresh Token
        // ==================================

        if (!tokenData.refresh_token) {

            console.error(
                "❌ NO REFRESH TOKEN RETURNED:",
                tokenData
            );

            return res
                .status(500)
                .json({

                    error:
                        "Shopify did not return an expiring offline token.",

                    details:
                        "The Shopify response did not contain refresh_token. Verify that the authorization request is for offline access and that expiring=1 is being sent."

                });

        }

        // ==================================
        // Check Access Token Expiration
        // ==================================

        if (!tokenData.expires_in) {

            console.error(
                "❌ NO ACCESS TOKEN EXPIRATION:",
                tokenData
            );

            return res
                .status(500)
                .json({

                    error:
                        "Shopify did not return access token expiration information.",

                    details:
                        tokenData

                });

        }

        // ==================================
        // Calculate Access Token Expiration
        // ==================================

        const now =
            Date.now();

        const expiresAt =
            new Date(

                now +
                (
                    Number(
                        tokenData.expires_in
                    ) *
                    1000
                )

            ).toISOString();

        // ==================================
        // Calculate Refresh Token Expiration
        // ==================================

        let refreshTokenExpiresAt = null;

        if (
            tokenData.refresh_token_expires_in
        ) {

            refreshTokenExpiresAt =
                new Date(

                    now +
                    (
                        Number(
                            tokenData.refresh_token_expires_in
                        ) *
                        1000
                    )

                ).toISOString();

        }

        // ==================================
        // Log Safe Token Information
        // ==================================

        console.log(
            "🔐 SHOPIFY EXPIRING TOKEN RECEIVED"
        );

        console.log({

            shop:
                shop,

            accessTokenReceived:
                !!tokenData.access_token,

            refreshTokenReceived:
                !!tokenData.refresh_token,

            expiresIn:
                tokenData.expires_in,

            refreshTokenExpiresIn:
                tokenData.refresh_token_expires_in,

            expiresAt:
                expiresAt,

            refreshTokenExpiresAt:
                refreshTokenExpiresAt

        });

        // ==================================
        // Save Shopify Store to Supabase
        // ==================================

        console.log(
            "💾 SAVING SHOP TO SUPABASE:",
            shop
        );

        await saveShop(

            shop,

            tokenData.access_token,

            tokenData.refresh_token,

            expiresAt,

            refreshTokenExpiresAt

        );

        console.log(
            "✅ SHOP SAVED TO SUPABASE:",
            shop
        );

        // ==================================
        // Success Response
        // ==================================

        res.send(`

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

                <title>
                    Auditly Pro Connected
                </title>

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
                    Your expiring Shopify access
                    token has been securely stored.
                </p>

                <br>

                <a href="/dashboard">
                    Return to Auditly Pro
                </a>

            </body>

            </html>

        `);

    } catch (error) {

        console.error(
            "❌ OAuth / Supabase ERROR:",
            error
        );

        res
            .status(500)
            .send(`

                <h1>
                    OAuth connection failed.
                </h1>

                <p>
                    Auditly Pro could not complete
                    the Shopify connection.
                </p>

                <p>
                    Check the Render logs for
                    the exact error.
                </p>

            `);

    }

});

// ==========================================
// Authentication Test
// ==========================================

router.get("/test", (req, res) => {

    res.json({

        success:
            true,

        message:
            "Auditly Pro authentication system is working.",

        architecture:
            "Shopify OAuth → Supabase",

        expiringTokens:
            true

    });

});

// ==========================================
// Export Router
// ==========================================

module.exports = router;
