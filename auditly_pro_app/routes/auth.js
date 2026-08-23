// ==========================================
// Auditly Pro v2 - Shopify Authentication
// ==========================================

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
// Validate Shopify Shop Domain
// ==========================================

function isValidShop(shop) {

    if (!shop) {
        return false;
    }

    return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i
        .test(shop);

}

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
// GET /auth/install?shop=store.myshopify.com
// ==========================================

router.get("/install", (req, res) => {

    const shop =
        String(req.query.shop || "")
            .trim()
            .toLowerCase();

    // ======================================
    // Validate Shop
    // ======================================

    if (!isValidShop(shop)) {

        console.error(
            "❌ INVALID SHOP:",
            shop
        );

        return res
            .status(400)
            .send(
                "Invalid Shopify shop name."
            );

    }

    // ======================================
    // Validate Environment Variables
    // ======================================

    if (
        !SHOPIFY_API_KEY ||
        !SHOPIFY_API_SECRET ||
        !HOST ||
        !SCOPES
    ) {

        console.error(
            "❌ Missing Shopify environment variables."
        );

        return res
            .status(500)
            .send(
                "Auditly Pro is missing required Shopify configuration."
            );

    }

    // ======================================
    // Create Secure OAuth State
    // ======================================

    const state =
        crypto
            .randomBytes(32)
            .toString("hex");

    oauthStates.set(state, {

        shop:
            shop,

        created:
            Date.now()

    });

    // ======================================
    // Remove Old OAuth States
    // ======================================

    const tenMinutes =
        10 * 60 * 1000;

    for (
        const [
            savedState,
            stateData
        ] of oauthStates.entries()
    ) {

        if (
            Date.now() -
            stateData.created >
            tenMinutes
        ) {

            oauthStates.delete(
                savedState
            );

        }

    }

    // ======================================
    // OAuth Callback URL
    // ======================================

    const redirectUri =
        `${HOST}/auth/callback`;

    // ======================================
    // Create Shopify Authorization URL
    // ======================================

    /*
     * IMPORTANT:
     *
     * We intentionally do NOT use:
     *
     * grant_options[]=per-user
     *
     * Auditly Pro needs offline access because
     * the server needs to access the merchant's
     * Shopify store after the merchant leaves
     * the app.
     *
     * expiring=1 is added during the token
     * exchange below.
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

    res.redirect(
        installUrl
    );

});

// ==========================================
// Shopify OAuth Callback
// GET /auth/callback
// ==========================================

router.get(
    "/callback",
    async (req, res) => {

        const shop =
            String(req.query.shop || "")
                .trim()
                .toLowerCase();

        const code =
            String(req.query.code || "")
                .trim();

        const state =
            String(req.query.state || "")
                .trim();

        // ======================================
        // Validate OAuth Parameters
        // ======================================

        if (
            !shop ||
            !code ||
            !state
        ) {

            console.error(
                "❌ Missing Shopify OAuth parameters."
            );

            return res
                .status(400)
                .send(`
                    <h1>
                        Shopify connection failed.
                    </h1>

                    <p>
                        Missing Shopify OAuth information.
                    </p>
                `);

        }

        // ======================================
        // Validate Shop Domain
        // ======================================

        if (!isValidShop(shop)) {

            console.error(
                "❌ Invalid Shopify shop returned:",
                shop
            );

            return res
                .status(400)
                .send(`
                    <h1>
                        Shopify connection failed.
                    </h1>

                    <p>
                        Invalid Shopify store.
                    </p>
                `);

        }

        // ======================================
        // Verify OAuth State
        // ======================================

        const savedState =
            oauthStates.get(state);

        if (!savedState) {

            console.error(
                "❌ INVALID OR EXPIRED OAUTH STATE"
            );

            return res
                .status(403)
                .send(`
                    <h1>
                        Shopify connection expired.
                    </h1>

                    <p>
                        Please return to Auditly Pro
                        and connect your Shopify store again.
                    </p>
                `);

        }

        // ======================================
        // Make Sure State Belongs To Same Shop
        // ======================================

        if (
            savedState.shop !== shop
        ) {

            console.error(
                "❌ SHOP MISMATCH DURING OAUTH"
            );

            oauthStates.delete(
                state
            );

            return res
                .status(403)
                .send(`
                    <h1>
                        Shopify connection failed.
                    </h1>

                    <p>
                        The Shopify store did not match
                        the original connection request.
                    </p>
                `);

        }

        // ======================================
        // State Can Only Be Used Once
        // ======================================

        oauthStates.delete(
            state
        );

        try {

            console.log(
                "🔄 Exchanging Shopify OAuth code..."
            );

            // ==================================
            // Exchange Authorization Code
            // ==================================

            /*
             * Shopify's authorization-code flow
             * supports expiring offline tokens.
             *
             * expiring=1 tells Shopify to return:
             *
             * access_token
             * refresh_token
             * expires_in
             * refresh_token_expires_in
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

            const response =
                await fetch(

                    `https://${shop}/admin/oauth/access_token`,

                    {

                        method:
                            "POST",

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

            // ==================================
            // Read Shopify Response
            // ==================================

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

                        success:
                            false,

                        error:
                            "Shopify token exchange failed.",

                        details:
                            tokenData

                    });

            }

            // ==================================
            // Check Access Token
            // ==================================

            if (
                !tokenData.access_token
            ) {

                console.error(
                    "❌ NO ACCESS TOKEN RETURNED:",
                    tokenData
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        error:
                            "Shopify did not return an access token.",

                        details:
                            tokenData

                    });

            }

            // ==================================
            // Check Refresh Token
            // ==================================

            if (
                !tokenData.refresh_token
            ) {

                console.error(
                    "❌ NO REFRESH TOKEN RETURNED:",
                    tokenData
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        error:
                            "Shopify did not return a refresh token.",

                        details:
                            "Verify that expiring=1 is being sent."

                    });

            }

            // ==================================
            // Check Access Token Expiration
            // ==================================

            if (
                !tokenData.expires_in
            ) {

                console.error(
                    "❌ NO ACCESS TOKEN EXPIRATION:",
                    tokenData
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        error:
                            "Shopify did not return access token expiration information.",

                        details:
                            tokenData

                    });

            }

            // ==================================
            // Calculate Expiration Times
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

            let refreshTokenExpiresAt =
                null;

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
            // Safe Token Logging
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
            // Save Shop To Supabase
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
            // IMPORTANT:
            // Return Merchant To Dashboard
            // WITH SHOP PARAMETER
            // ==================================

            const dashboardUrl =
                `/dashboard?shop=${encodeURIComponent(
                    shop
                )}`;

            console.log(
                "➡️ RETURNING MERCHANT TO:",
                dashboardUrl
            );

            return res.redirect(
                dashboardUrl
            );

        } catch (error) {

            console.error(
                "❌ OAUTH / SUPABASE ERROR:",
                error
            );

            return res
                .status(500)
                .send(`

                    <!DOCTYPE html>

                    <html>

                    <head>

                        <meta charset="UTF-8">

                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1.0"
                        >

                        <title>
                            Auditly Pro Connection Error
                        </title>

                    </head>

                    <body>

                        <h1>
                            OAuth connection failed.
                        </h1>

                        <p>
                            Auditly Pro could not complete
                            the Shopify connection.
                        </p>

                        <p>
                            Please check the Render logs
                            for the exact error.
                        </p>

                    </body>

                    </html>

                `);

        }

    }
);

// ==========================================
// Authentication Test
// ==========================================

router.get(
    "/test",
    (req, res) => {

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

    }
);

// ==========================================
// Export Router
// ==========================================

module.exports = router;
