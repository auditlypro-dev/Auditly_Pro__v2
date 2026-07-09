// ==========================================
// Auditly Pro v2
// Shopify Service
// ==========================================

class ShopifyService {

    constructor() {

        this.apiKey = process.env.SHOPIFY_API_KEY || "";
        this.apiSecret = process.env.SHOPIFY_API_SECRET || "";

    }

    async connect(shop) {

        return {
            success: true,
            shop: shop,
            status: "Connected"
        };

    }

    async getStoreInfo(shop) {

        return {
            success: true,
            shop: shop,
            name: "Demo Shopify Store",
            plan: "Basic"
        };

    }

}

module.exports = new ShopifyService();
