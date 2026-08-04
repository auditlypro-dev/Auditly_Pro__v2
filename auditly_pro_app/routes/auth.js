const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

console.log("🔥 USING UPDATED AUTH FILE");
console.log("🔥 AUTH ROUTER LOADED");


const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const HOST = process.env.HOST;
const SCOPES = process.env.SCOPES;


// Temporary storage for OAuth states
const oauthStates = {};


// --------------------------------------------
// Test Route
// --------------------------------------------

router.get("/hello", (req, res) => {
    res.send("HELLO FROM UPDATED AUTH FILE");
});


// --------------------------------------------
// Install Route
// --------------------------------------------

router.get("/install", (req, res) => {

    const shop = req.query.shop;


    if (!shop) {
        return res.status(400).send("Missing Shopify shop name");
    }


    const state = crypto
        .randomBytes(16)
        .toString("hex");


    oauthStates[state] = {
        shop,
        created: Date.now()
    };


    const redirectUri = `${HOST}/auth/callback`;


    const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${SHOPIFY_API_KEY}` +
        `&scope=${SCOPES}` +
        `&redirect_uri=${redirectUri}` +
        `&state=${state}`;


    console.log("SHOPIFY INSTALL URL CREATED");


    res.redirect(installUrl);

});


// --------------------------------------------
// OAuth Callback
// --------------------------------------------

router.get("/callback", async (req, res) => {


    const {
        shop,
        code,
        state
    } = req.query;



    if (!shop || !code || !state) {

        return res.status(400)
            .send("Missing Shopify OAuth information");

    }



    if (!oauthStates[state]) {

        return res.status(403)
            .send("Invalid OAuth state");

    }



    delete oauthStates[state];



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



        console.log("SHOPIFY TOKEN RESPONSE RECEIVED");



        if (!data.access_token) {


            return res.status(500).json({

                error: "No Shopify access token received",

                details: data

            });

        }



        const shopData = {

            shop,

            accessToken: data.access_token,

            installed: new Date().toISOString()

        };



        const filePath = path.join(
            __dirname,
            "../data/shops.json"
        );



        let shops = [];



        if (fs.existsSync(filePath)) {


            const contents =
                fs.readFileSync(filePath, "utf8").trim();


            if (contents) {

                shops = JSON.parse(contents);

            }

        }



        const existingIndex =
            shops.findIndex(
                item => item.shop === shop
            );



        if (existingIndex >= 0) {

            shops[existingIndex] = shopData;

        } else {

            shops.push(shopData);

        }



        fs.writeFileSync(

            filePath,

            JSON.stringify(
                shops,
                null,
                2
            ),

            "utf8"

        );



        console.log("SHOP SAVED");

        console.log({

            shop,

            tokenSaved:
                !!shopData.accessToken

        });



        res.send(`

            <h1>🎉 Auditly Pro Connected!</h1>

            <p>Store:</p>

            <strong>${shop}</strong>

            <br><br>

            Your Shopify store is connected.

        `);



    } catch(error) {


        console.error(
            "OAuth ERROR:",
            error
        );


        res.status(500)
            .send("OAuth failed");


    }


});



// --------------------------------------------
// Test Route
// --------------------------------------------

router.get("/test", (req,res)=>{

    res.send(
        "AUTH ROUTER IS WORKING"
    );

});


module.exports = router;
