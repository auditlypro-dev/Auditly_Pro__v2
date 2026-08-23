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
// GET /auth/hello
// ==========================================

router.get("/hello", (req, res) => {

    res.send(
        "HELLO FROM EXPIRING TOKEN AUTH FILE"
    );

});


// ==========================================
// Shopify Install Route
// GET /auth/install?shop=...
// ==========================================

router.get("/install", (req, res) => {

    const shop =
        req.query.shop;


    if (!shop) {

        return res
            .status(400)
            .send(
                "Missing Shopify shop name"
            );

    }


    // ======================================
    // Basic Shopify domain validation
    // ======================================

    const validShop =
        /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i
            .test(shop);


    if (!validShop) {

        return res
            .status(400)
            .send(
                "Invalid Shopify shop name"
            );

    }


    // ======================================
    // Create secure OAuth state
    // ======================================

    const state =
        crypto
            .randomBytes(16)
            .toString("hex");


    oauthStates.set(
        state,
        {
            shop: shop,
            created: Date.now()
        }
    );


    // ======================================
    // OAuth callback URL
    // ======================================

    const redirectUri =
        `${HOST}/auth/callback`;


    /*
     * Auditly Pro uses an expiring offline
     * Shopify access token.
     *
     * We intentionally do NOT use:
     *
     * grant_options[]=per-user
     *
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
// OAuth Callback
// GET /auth/callback
// ==========================================

router.get(
    "/callback",
    async (req, res) => {

        const {
            shop,
            code,
            state
        } = req.query;


        // ======================================
        // Validate OAuth parameters
        // ======================================

        if (
            !shop ||
            !code ||
            !state
        ) {

            return res
                .status(400)
                .send(
                    "Missing Shopify OAuth information"
                );

        }


        // ======================================
        // Verify OAuth state
        // ======================================

        const savedState =
            oauthStates.get(
                state
            );


        if (!savedState) {

            return res
                .status(403)
                .send(
                    "Invalid or expired OAuth state"
                );

        }


        // ======================================
        // Make sure the state belongs
        // to the same Shopify store
        // ======================================

        if (
            savedState.shop !== shop
        ) {

            oauthStates.delete(
                state
            );


            return res
                .status(403)
                .send(
                    "OAuth shop validation failed"
                );

        }


        // State can only be used once.
        oauthStates.delete(
            state
        );


        try {

            console.log(
                "🔄 Exchanging Shopify OAuth code..."
            );


            // ==================================
            // Exchange authorization code
            // ==================================

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


            const tokenData =
                await response.json();


            console.log(
                "SHOPIFY TOKEN RESPONSE RECEIVED"
            );


            // ==================================
            // Check Shopify response
            // ==================================

            if (
                !response.ok
            ) {

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
            // Check access token
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

                        error:
                            "Shopify did not return an access token",

                        details:
                            tokenData

                    });

            }


            // ==================================
            // Check refresh token
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

                        error:
                            "Shopify did not return an expiring offline token.",

                        details:
                            "The Shopify response did not contain refresh_token. Verify that the authorization request is for offline access and that expiring=1 is being sent."

                    });

            }


            // ==================================
            // Check access token expiration
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

                        error:
                            "Shopify did not return access token expiration information.",

                        details:
                            tokenData

                    });

            }


            // ==================================
            // Calculate expiration times
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
            // Safe token logging
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
            // Save Shopify store to Supabase
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
            // RETURN TO DASHBOARD
            // ==================================
            //
            // IMPORTANT:
            //
            // We include the Shopify store in
            // the dashboard URL so dashboard.js
            // knows which merchant store it is
            // displaying.
            //
            // ==================================

            const dashboardUrl =
                `/dashboard?shop=${encodeURIComponent(
                    shop
                )}`;


            console.log(
                "➡️ RETURNING TO DASHBOARD:",
                dashboardUrl
            );


            return res.redirect(
                dashboardUrl
            );

        } catch (error) {

            console.error(
                "❌ OAuth / Supabase ERROR:",
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
                            Check the Render logs for
                            the exact error.
                        </p>

                    </body>

                    </html>

                `);

        }

    }
);


// ==========================================
// Authentication Test
// GET /auth/test
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
