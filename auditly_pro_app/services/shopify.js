// ==========================================
// Auditly Pro v2
// Shopify Service
// ==========================================

const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION || "2026-01";


// ==========================================
// Shopify API Request
// ==========================================

async function shopifyRequest(shop, accessToken, endpoint) {

    if (!shop) {
        throw new Error("Shop domain is required");
    }

    if (!accessToken) {
        throw new Error("Shopify access token is required");
    }

    const url =
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;

    console.log("🔎 Shopify API request:", endpoint);

    const response = await fetch(url, {

        method: "GET",

        headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json"
        }

    });


    let data;

    try {

        data = await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        console.error(
            "❌ Shopify API request failed:",
            response.status,
            data
        );

        const error = new Error(
            "Shopify API request failed"
        );

        error.status = response.status;
        error.details = data;

        throw error;

    }


    return data;

}


// ==========================================
// Get Store Information
// ==========================================

async function getStoreInfo(shop, accessToken) {

    try {

        const data = await shopifyRequest(
            shop,
            accessToken,
            "/shop.json"
        );


        return {

            success: true,

            store: data.shop

        };


    } catch (error) {

        console.error(
            "❌ SHOPIFY STORE INFO ERROR:",
            error
        );


        return {

            success: false,

            status: error.status || 500,

            message: error.message,

            details: error.details || null

        };

    }

}


// ==========================================
// Get Products
// ==========================================

async function getProducts(shop, accessToken) {

    return shopifyRequest(
        shop,
        accessToken,
        "/products.json?limit=50"
    );

}


// ==========================================
// Get Themes
// ==========================================

async function getThemes(shop, accessToken) {

    return shopifyRequest(
        shop,
        accessToken,
        "/themes.json"
    );

}


// ==========================================
// Export
// ==========================================

module.exports = {

    shopifyRequest,

    getStoreInfo,

    getProducts,

    getThemes

};
