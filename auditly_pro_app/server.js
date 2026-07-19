process.on("uncaughtException", (error) => {
    console.error("🔥 UNCAUGHT EXCEPTION:");
    console.error(error);
});

process.on("unhandledRejection", (error) => {
    console.error("🔥 UNHANDLED REJECTION:");
    console.error(error);
});
// ==========================================
// Auditly Pro v2
// Shopify Service
// ==========================================

async function shopifyRequest(shop, accessToken, endpoint) {

    try {

        const response = await fetch(
            `https://${shop}/admin/api/2025-10/${endpoint}`,
            {
                method: "GET",
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {

            return {
                success: false,
                status: response.status,
                message: `Shopify API returned ${response.status}`
            };

        }

        return await response.json();

    } catch (error) {

        return {
            success: false,
            message: error.message
        };

    }

}


// ==========================================
// Store Information
// ==========================================

async function getStoreInfo(shop, accessToken) {

    return await shopifyRequest(
        shop,
        accessToken,
        "shop.json"
    );

}


// ==========================================
// Products
// ==========================================

async function getProducts(shop, accessToken) {

    return await shopifyRequest(
        shop,
        accessToken,
        "products.json?limit=250"
    );

}


// ==========================================
// Collections
// ==========================================

async function getCollections(shop, accessToken) {

    return await shopifyRequest(
        shop,
        accessToken,
        "custom_collections.json"
    );

}


// ==========================================
// Pages
// ==========================================

async function getPages(shop, accessToken) {

    return await shopifyRequest(
        shop,
        accessToken,
        "pages.json"
    );

}


// ==========================================
// Themes
// ==========================================

async function getThemes(shop, accessToken) {

    return await shopifyRequest(
        shop,
        accessToken,
        "themes.json"
    );

}


// ==========================================
// Policies
// ==========================================

async function getPolicies(shop, accessToken) {

    return await shopifyRequest(
        shop,
        accessToken,
        "policies.json"
    );

}


module.exports = {

    getStoreInfo,
    getProducts,
    getCollections,
    getPages,
    getThemes,
    getPolicies

};
