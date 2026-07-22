const fetch = global.fetch;

// ==========================================
// Shopify Service
// ==========================================

async function getStoreInfo(shop, accessToken) {

    try {

        const response = await fetch(
            `https://${shop}/admin/api/2025-01/shop.json`,
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
                message: "Unable to connect to Shopify."
            };

        }

        const data = await response.json();

        return {
            success: true,
            store: data.shop
        };

    } catch (error) {

        console.error("SHOPIFY SERVICE ERROR:", error);

        return {
            success: false,
            message: error.message
        };

    }

}

module.exports = {
    getStoreInfo
};
