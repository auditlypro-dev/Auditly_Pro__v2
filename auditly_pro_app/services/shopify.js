const fetch = global.fetch;

async function getStoreInfo(shop, accessToken) {

    try {

        const response = await fetch(
            `https://${shop}/admin/api/2025-07/shop.json`,
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
                message: "Unable to connect to Shopify."
            };

        }

        const data = await response.json();

        return {
            success: true,
            shop: data.shop
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            message: error.message
        };

    }

}

module.exports = {
    getStoreInfo
};
