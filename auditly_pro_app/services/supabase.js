const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
    console.error("❌ SUPABASE_URL is missing");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing");
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);


// ==========================================
// Save / Update Shopify Store
// ==========================================

async function saveShop(shop, accessToken) {

    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from("shops")
        .upsert(
            {
                shop: shop,
                access_token: accessToken,
                installed_at: now,
                updated_at: now
            },
            {
                onConflict: "shop"
            }
        )
        .select()
        .single();


    if (error) {

        console.error(
            "❌ SUPABASE SAVE SHOP ERROR:",
            error
        );

        throw error;
    }


    console.log(
        "✅ SHOP SAVED TO SUPABASE:",
        shop
    );


    return data;
}


// ==========================================
// Find Shopify Store
// ==========================================

async function getShop(shop) {

    const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("shop", shop)
        .single();


    if (error) {

        console.error(
            "❌ SUPABASE GET SHOP ERROR:",
            error
        );

        return null;
    }


    return data;
}


// ==========================================
// Export
// ==========================================

module.exports = {
    supabase,
    saveShop,
    getShop
};
