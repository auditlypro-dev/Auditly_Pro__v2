const express = require("express");
const router = express.Router();

const path = require("path");

const {
    createClient
} = require("@supabase/supabase-js");

console.log("🔥 DASHBOARD ROUTER LOADED");

// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_KEY =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

// ==========================================
// Dashboard Home
// GET /dashboard
// ==========================================

router.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../views/dashboard.html"
        )
    );

});

// ==========================================
// Dashboard Status
// GET /dashboard/status
// ==========================================

router.get("/status", (req, res) => {

    res.json({

        success: true,

        application:
            "Auditly Pro v2",

        status:
            "Running",

        version:
            "2.0.0"

    });

});

// ==========================================
// Dashboard Health
// GET /dashboard/health
// ==========================================

router.get("/health", (req, res) => {

    res.json({

        success: true,

        server:
            "Online",

        timestamp:
            new Date().toISOString()

    });

});

// ==========================================
// Connected Shopify Store
// GET /dashboard/shop
// ==========================================

router.get("/shop", async (req, res) => {

    try {

        console.log(
            "🏪 Looking up connected Shopify store..."
        );

        const {
            data,
            error
        } = await supabase

            .from("shops")

            .select(
                "shop, shop_domain, access_token"
            )

            .order(
                "updated_at",
                {
                    ascending: false
                }
            )

            .limit(1)

            .maybeSingle();

        if (error) {

            console.error(
                "❌ Supabase shop lookup failed:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Unable to retrieve connected Shopify store.",

                details:
                    error.message

            });

        }

        if (!data) {

            console.log(
                "⚠️ No connected Shopify store found."
            );

            return res.status(404).json({

                success: false,

                error:
                    "No Shopify store is currently connected."

            });

        }

        const shop =
            data.shop ||
            data.shop_domain;

        if (!shop) {

            return res.status(404).json({

                success: false,

                error:
                    "Connected Shopify store has no shop domain."

            });

        }

        console.log(
            "✅ Connected Shopify store:",
            shop
        );

        return res.json({

            success: true,

            shop: shop

        });

    } catch (error) {

        console.error(
            "❌ Dashboard shop endpoint error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Unable to determine connected Shopify store.",

            details:
                error.message

        });

    }

});

// ==========================================
// EXPORT
// ==========================================

module.exports = router;
