// ==========================================
// Auditly Pro v2
// Shopify Service
// ==========================================

class ShopifyService {

    constructor() {

        this.apiVersion = "2026-01";

    }


    async connect(shop) {

        return {
            success: true,
            shop: shop,
            status: "Connected"
        };

    }


    async getStoreInfo(shop, accessToken) {

        try {

            const response = await fetch(
                `https://${shop}/admin/api/${this.apiVersion}/shop.json`,
                {
                    method: "GET",
                    headers: {
                        "X-Shopify-Access-Token": accessToken,
                        "Content-Type": "application/json"
                    }
                }
            );


            const data = await response.json();


            if (!response.ok) {

                throw new Error(
                    JSON.stringify(data)
                );

            }


            return {

                success: true,

                shop: data.shop

            };


        } catch (error) {

            console.error(
                "SHOPIFY API ERROR:",
                error
            );


            return {

                success: false,

                error: error.message

            };

        }

    }

}


module.exports = new ShopifyService();
