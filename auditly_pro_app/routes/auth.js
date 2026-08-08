const express = require("express");
const router = express.Router();

const crypto = require("crypto");

const {
    saveShop
} = require("../services/supabase");

console.log("🔥 USING SUPABASE AUTH FILE");
console.log("🔥 AUTH ROUTER LOADED");


const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const HOST = process.env.HOST;
const SCOPES = process.env.SCOPES;


// Temporary OAuth state storage
const oauthStates = {};


// ==========================================
// Test Route
// ==========================================

router.get("/hello", (req, res) => {

    res.send("HELLO FROM SUPABASE AUTH FILE");

});


// ==========================================
// Install Route
// ==========================================

router.get("/install", (req, res) => {

    const shop = req.query.shop;


    if (!shop) {

        return res
            .status(400)
            .send("Missing Shopify shop name");

    }


    const state = crypto
        .randomBytes(16)
        .toString("hex");


    oauthStates[state] = {

        shop: shop,

        created: Date.now()

    };


    const redirectUri =
        `${HOST}/auth/callback`;


    const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${SHOPIFY_API_KEY}` +
        `&scope=${SCOPES}` +
        `&redirect_uri=${redirectUri}` +
        `&state=${state}`;


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

        return res
            .status(400)
            .send("Missing Shopify OAuth information");

    }


    // --------------------------------------
    // Verify OAuth State
    // --------------------------------------

    if (!oauthStates[state]) {

        return res
            .status(403)
            .send("Invalid OAuth state");

    }


    delete oauthStates[state];


    try {

        // ----------------------------------
        // Exchange OAuth code for token
        // ----------------------------------

        const response = await fetch(

            `https://${shop}/admin/oauth/access_token`,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    client_id:
                        SHOPIFY_API_KEY,

                    client_secret:
                        SHOPIFY_API_SECRET,

                    code: code

                })

            }

        );


        const data =
            await response.json();


        console.log(
            "SHOPIFY TOKEN RESPONSE RECEIVED"
        );


        if (!response.ok || !data.access_token) {

            console.error(
                "SHOPIFY TOKEN ERROR:",
                data
            );

            return res
                .status(500)
                .json({

                    error:
                        "No Shopify access token received",

                    details:
                        data

                });

        }


        const accessToken =
            data.access_token;


        // ----------------------------------
        // Save Shopify store to Supabase
        // ----------------------------------

        console.log(
            "SAVING SHOP TO SUPABASE:",
            shop
        );


        await saveShop(
            shop,
            accessToken
        );


        console.log(
            "✅ SHOP SAVED TO SUPABASE:",
            shop
        );


        // ----------------------------------
        // Success response
        // ----------------------------------

        res.send(`

            <h1>🎉 Auditly Pro Connected!</h1>

            <p>Store:</p>

            <strong>${shop}</strong>

            <br><br>

            <p>
                Your Shopify store is connected
                and securely saved.
            </p>

        `);


    } catch (error) {

        console.error(
            "❌ OAuth / Supabase ERROR:",
            error
        );


        res
            .status(500)
            .send(
                "OAuth connection failed. Please try again."
            );

    }

});


// ==========================================
// Test Route
// ==========================================

router.get("/test", (req, res) => {

    res.send(
        "AUTH ROUTER IS WORKING"
    );

});


module.exports = router;
