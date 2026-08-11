const express = require("express");

const router = express.Router();


// ==========================================
// Auditly Pro v2
// Supabase + Shopify API Routes
// ==========================================

const {
    getShop
} = require("../services/supabase");


const {
    getStoreInfo,
    getProducts,
    getThemes
} = require("../services/shopify");


// ==========================================
// GET /api/store
//
// Example:
// /api/store?shop=auditly-pro-app.myshopify.com
// ==========================================

router.get("/store", async (req, res) => {

    try {

        const shop = req.query.shop;


        if (!shop) {

            return res.status(400).json({

                success: false,

                error: "Missing shop parameter"

            });

        }


        console.log(
            "🔎 Looking up shop in Supabase:",
            shop
        );


        // --------------------------------------
        // Find shop in Supabase
        // --------------------------------------

        const store = await getShop(shop);


        if (!store) {

            return res.status(404).json({

                success: false,

                error: "Shop not found in Supabase",

                shop

            });

        }


        if (!store.access_token) {

            return res.status(401).json({

                success: false,

                error: "No Shopify access token found",

                shop

            });

        }


        console.log(
            "✅ Shop found in Supabase"
        );


        // --------------------------------------
        // Get Shopify store information
        // --------------------------------------

        const result = await getStoreInfo(

            shop,

            store.access_token

        );


        if (!result.success) {

            return res.status(
                result.status || 500
            ).json({

                success: false,

                error:
                    result.message ||
                    "Unable to retrieve Shopify store",

                details:
                    result.details || null

            });

        }


        console.log(
            "✅ Shopify store information received"
        );


        // --------------------------------------
        // Return store information
        // --------------------------------------

        res.json({

            success: true,

            shop: shop,

            store: result.store

        });


    } catch (error) {

        console.error(
            "❌ /api/store ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            error:
                "Unable to retrieve Shopify store data",

            details:
                error.message

        });

    }

});


// ==========================================
// GET /api/products
//
// Example:
// /api/products?shop=auditly-pro-app.myshopify.com
// ==========================================

router.get("/products", async (req, res) => {

    try {

        const shop = req.query.shop;


        if (!shop) {

            return res.status(400).json({

                success: false,

                error: "Missing shop parameter"

            });

        }


        console.log(
            "🔎 Loading products for:",
            shop
        );


        const store = await getShop(shop);


        if (!store) {

            return res.status(404).json({

                success: false,

                error: "Shop not found in Supabase"

            });

        }


        if (!store.access_token) {

            return res.status(401).json({

                success: false,

                error: "No Shopify access token found"

            });

        }


        const data = await getProducts(

            shop,

            store.access_token

        );


        res.json({

            success: true,

            shop: shop,

            products:
                data.products || []

        });


    } catch (error) {

        console.error(
            "❌ /api/products ERROR:",
            error
        );


        res.status(
            error.status || 500
        ).json({

            success: false,

            error:
                "Unable to retrieve Shopify products",

            details:
                error.details ||
                error.message

        });

    }

});


// ==========================================
// GET /api/themes
//
// Example:
// /api/themes?shop=auditly-pro-app.myshopify.com
// ==========================================

router.get("/themes", async (req, res) => {

    try {

        const shop = req.query.shop;


        if (!shop) {

            return res.status(400).json({

                success: false,

                error: "Missing shop parameter"

            });

        }


        console.log(
            "🔎 Loading themes for:",
            shop
        );


        const store = await getShop(shop);


        if (!store) {

            return res.status(404).json({

                success: false,

                error: "Shop not found in Supabase"

            });

        }


        if (!store.access_token) {

            return res.status(401).json({

                success: false,

                error: "No Shopify access token found"

            });

        }


        const data = await getThemes(

            shop,

            store.access_token

        );


        res.json({

            success: true,

            shop: shop,

            themes:
                data.themes || []

        });


    } catch (error) {

        console.error(
            "❌ /api/themes ERROR:",
            error
        );


        res.status(
            error.status || 500
        ).json({

            success: false,

            error:
                "Unable to retrieve Shopify themes",

            details:
                error.details ||
                error.message

        });

    }

});


// ==========================================
// API Health / Test
// ==========================================

router.get("/test", (req, res) => {

    res.json({

        success: true,

        message:
            "Auditly Pro API is working",

        architecture:
            "Supabase → Shopify API"

    });

});


// ==========================================
// Export
// ==========================================

module.exports = router;
