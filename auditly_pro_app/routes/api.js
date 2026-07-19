const express = require("express");
const router = express.Router();

console.log("🔥 API ROUTES FILE LOADED");

const fs = require("fs");
const path = require("path");

const shopifyService = require("../services/shopify");


// ==========================================
// Auditly Pro v2
// API Routes
// ==========================================


// Test API

router.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Auditly Pro API"
    });

});


// ==========================================
// Shopify Connection Status
// ==========================================

router.get("/shop/status", (req, res) => {

    const filePath = path.join(
        __dirname,
        "../data/shops.json"
    );


    if (!fs.existsSync(filePath)) {

        return res.json({
            connected: false
        });

    }


    const shops = JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );


    if (!shops.length) {

        return res.json({
            connected: false
        });

    }


    res.json({

        connected: true,

        shop: shops[0].shop

    });

});


// ==========================================
// Shopify Store Information
// ==========================================

router.get("/store", async (req, res) => {

    const shop = req.query.shop;
    const accessToken = req.query.token;


    if (!shop || !accessToken) {

        return res.status(400).json({

            success:false,

            message:"Missing shop or token"

        });

    }


    const storeInfo = await shopifyService.getStoreInfo(
        shop,
        accessToken
    );


    res.json(storeInfo);

});


// ==========================================
// Audit Starter
// ==========================================

router.post("/audit", (req,res)=>{

    res.json({

        success:true,

        auditStatus:"Started",

        message:"Store audit initiated."

    });

});


// ==========================================
// Audit Results
// ==========================================

router.get("/results",(req,res)=>{

    res.json({

        success:true,

        results:[]

    });

});

// ==========================================
// Shopify Connection Status
// ==========================================

router.get("/store/status", (req, res) => {

    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(
        __dirname,
        "../data/shops.json"
    );


    if (!fs.existsSync(filePath)) {

        return res.json({
            connected: false
        });

    }


    const shops = JSON.parse(
        fs.readFileSync(filePath)
    );


    if (!shops || shops.length === 0) {

        return res.json({
            connected: false
        });

    }


    res.json({

        connected: true,
        shop: shops[0].shop

    });


});

module.exports = router;
router.get("/debug/shops", (req,res)=>{

    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(
        __dirname,
        "../data/shops.json"
    );


    if(!fs.existsSync(filePath)){
        return res.json({
            exists:false
        });
    }


    const data = fs.readFileSync(filePath, "utf8");


    res.json({
        exists:true,
        contents:data
    });

});
