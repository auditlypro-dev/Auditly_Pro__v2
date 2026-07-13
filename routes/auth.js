const express = require("express");
const router = express.Router();
console.log("🔥 AUTH ROUTER LOADED");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const HOST = process.env.HOST;

const SCOPES = process.env.SCOPES;

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


router.get("/callback", async (req,res)=>{

    const shop = req.query.shop;
    const code = req.query.code;


    if(!shop || !code){
        return res.status(400).send("Missing Shopify OAuth information");
    }


    try {

        const response = await fetch(
            `https://${shop}/admin/oauth/access_token`,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    client_id:SHOPIFY_API_KEY,
                    client_secret:SHOPIFY_API_SECRET,
                    code:code
                })
            }
        );

const data = await response.json();

const shopData = {
    shop: shop,
    accessToken: data.access_token,
    installed: new Date().toISOString()
};


const filePath = path.join(__dirname, "../data/shops.json");


let shops = [];

if (fs.existsSync(filePath)) {
    shops = JSON.parse(fs.readFileSync(filePath));
}


const existingShop = shops.find(
    item => item.shop === shop
);


if (!existingShop) {
    shops.push(shopData);
}


fs.writeFileSync(
    filePath,
    JSON.stringify(shops, null, 2)
);


console.log("SHOP SAVED:");
console.log(shopData);
        


        res.send(`
            <h1>🎉 Shopify Connected!</h1>
            <p>Store:</p>
            <strong>${shop}</strong>
            <br><br>
            You can now return to Auditly Pro.
        `);


    } catch(error){

        console.error(error);
        res.status(500).send("OAuth failed");

    }

});

router.get("/test", (req, res) => {
    res.send("AUTH ROUTER IS WORKING");
});
module.exports = router;
