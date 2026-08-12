const express = require("express");
console.log("🔥 USING NEW SUPABASE API FILE");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

console.log("🔥 USING NEW API FILE - SHOPIFY EXPIRING TOKENS");

// ==================================================
// ENVIRONMENT VARIABLES
// ==================================================

const SHOPIFY_API_VERSION = "2026-07";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ==================================================
// SUPABASE
// ==================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==================================================
// REFRESH TOKEN LOCK
// Prevents multiple simultaneous refreshes
// ==================================================

const refreshLocks = new Map();

// ==================================================
// FIND SHOP
// ==================================================

async function getShopRecord(shop) {

    const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("shop", shop)
        .limit(1);

    if (error) {
        throw new Error(
            `Supabase shop lookup failed: ${error.message}`
        );
    }

    if (!data || data.length === 0) {
        return null;
    }

    return data[0];
}

// ==================================================
// REFRESH SHOPIFY OFFLINE TOKEN
// ==================================================

async function refreshShopifyToken(shop, shopRecord) {

    // If another request is already refreshing this shop,
    // wait for that refresh to finish.
    if (refreshLocks.has(shop)) {
        return await refreshLocks.get(shop);
    }

    const refreshPromise = (async () => {

        console.log(
            "🔄 Refreshing Shopify access token for:",
            shop
        );

        if (!shopRecord.refresh_token) {
            throw new Error(
                "No Shopify refresh token is stored for this shop."
            );
        }

        const response = await fetch(
            `https://${shop}/admin/oauth/access_token`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Accept":
                        "application/json"
                },

                body: new URLSearchParams({
                    client_id: SHOPIFY_API_KEY,
                    client_secret: SHOPIFY_API_SECRET,
                    grant_type: "refresh_token",
                    refresh_token:
                        shopRecord.refresh_token
                }).toString()
            }
        );

        const tokenData = await response.json();

        if (!response.ok) {

            console.error(
                "❌ Shopify token refresh failed:",
                tokenData
            );

            throw new Error(
                tokenData.error_description ||
                tokenData.error ||
                "Shopify token refresh failed"
            );
        }

        if (!tokenData.access_token) {
            throw new Error(
                "Shopify did not return a new access token."
            );
        }

        if (!tokenData.refresh_token) {
            throw new Error(
                "Shopify did not return a new refresh token."
            );
        }

        // ==================================================
        // CALCULATE NEW EXPIRATION TIMES
        // ==================================================

        const now = Date.now();

        const expiresAt = new Date(
            now + (tokenData.expires_in * 1000)
        ).toISOString();

        const refreshTokenExpiresAt =
            tokenData.refresh_token_expires_in
                ? new Date(
                    now +
                    (tokenData.refresh_token_expires_in * 1000)
                ).toISOString()
                : shopRecord.refresh_token_expires_at;

        // ==================================================
        // SAVE ROTATED TOKENS
        // ==================================================

        const { data, error } = await supabase
            .from("shops")
            .update({
                access_token:
                    tokenData.access_token,

                refresh_token:
                    tokenData.refresh_token,

                expires_at:
                    expiresAt,

                refresh_token_expires_at:
                    refreshTokenExpiresAt,

                updated_at:
                    new Date().toISOString()
            })
            .eq("shop", shop)
            .select();

        if (error) {

            throw new Error(
                `Unable to save refreshed Shopify tokens: ${error.message}`
            );
        }

        console.log(
            "✅ Shopify token refreshed successfully"
        );

        return {
            access_token:
                tokenData.access_token,

            refresh_token:
                tokenData.refresh_token,

            expires_at:
                expiresAt,

            refresh_token_expires_at:
                refreshTokenExpiresAt
        };

    })();

    refreshLocks.set(shop, refreshPromise);

    try {
        return await refreshPromise;
    } finally {
        refreshLocks.delete(shop);
    }
}

// ==================================================
// GET A VALID SHOPIFY ACCESS TOKEN
// ==================================================

async function getValidAccessToken(shop, shopRecord) {

    if (!shopRecord.access_token) {
        throw new Error(
            "No Shopify access token is stored for this shop."
        );
    }

    if (!shopRecord.expires_at) {

        throw new Error(
            "This shop does not have an expiring Shopify token. Reinstall or migrate the shop."
        );
    }

    const expirationTime =
        new Date(shopRecord.expires_at).getTime();

    const currentTime =
        Date.now();

    // Refresh 5 minutes before expiration.
    const refreshBuffer =
        5 * 60 * 1000;

    if (
        currentTime <
        (expirationTime - refreshBuffer)
    ) {

        return shopRecord.access_token;
    }

    console.log(
        "⏰ Shopify access token is expired or nearly expired."
    );

    const refreshed =
        await refreshShopifyToken(
            shop,
            shopRecord
        );

    return refreshed.access_token;
}

// ==================================================
// SHOPIFY GRAPHQL REQUEST
// ==================================================

async function shopifyGraphQL(
    shop,
    accessToken,
    query,
    variables = {}
) {

    const response = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",

                "X-Shopify-Access-Token":
                    accessToken
            },

            body: JSON.stringify({
                query,
                variables
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {

        throw new Error(
            `Shopify GraphQL HTTP error: ${response.status}`
        );
    }

    if (data.errors) {

        console.error(
            "❌ Shopify GraphQL errors:",
            data.errors
        );

        throw new Error(
            data.errors
                .map(error => error.message)
                .join("; ")
        );
    }

    return data;
}

// ==================================================
// GET STORE INFORMATION
// ==================================================

router.get("/store", async (req, res) => {

    try {

        const shop = req.query.shop;

        if (!shop) {

            return res.status(400).json({
                error: "Missing shop parameter"
            });
        }

        console.log(
            "🔎 Looking up shop in Supabase:",
            shop
        );

        // ==================================================
        // GET SHOP FROM SUPABASE
        // ==================================================

        const shopRecord =
            await getShopRecord(shop);

        if (!shopRecord) {

            return res.status(404).json({
                error: "Shop not found",
                shop: shop
            });
        }

        console.log(
            "✅ Shop found in Supabase"
        );

        // ==================================================
        // GET VALID TOKEN
        // ==================================================

        const accessToken =
            await getValidAccessToken(
                shop,
                shopRecord
            );

        console.log(
            "🔑 Valid Shopify access token ready"
        );

        // ==================================================
        // GRAPHQL QUERY
        // ==================================================

        const query = `
            query {
                shop {
                    id
                    name
                    email
                    myshopifyDomain
                    primaryDomain {
                        host
                        url
                    }
                    currencyCode
                    timezoneAbbreviation
                }
            }
        `;

        const shopifyData =
            await shopifyGraphQL(
                shop,
                accessToken,
                query
            );

        const store =
            shopifyData.data.shop;

        console.log(
            "✅ Shopify store data received"
        );

        // ==================================================
        // RETURN STORE INFORMATION
        // ==================================================

        res.json({
            success: true,
            shop: store
        });

    } catch (error) {

        console.error(
            "❌ Shopify API Error:",
            error.message
        );

        res.status(500).json({
            error:
                "Unable to retrieve Shopify store data",

            details:
                error.message
        });
    }
});

// ==================================================
// DEBUG ROUTE
// ==================================================

router.get("/debug", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("shops")
                .select(
                    "shop, installed_at, updated_at, expires_at, refresh_token_expires_at"
                );

        if (error) {

            return res.status(500).json({
                error:
                    "Supabase lookup failed",

                details:
                    error.message
            });
        }

        res.json({
            success: true,
            shops: data
        });

    } catch (error) {

        console.error(
            "❌ Debug error:",
            error
        );

        res.status(500).json({
            error:
                "Debug request failed",

            details:
                error.message
        });
    }
});

// ==================================================
// EXPORT ROUTER
// ==================================================

module.exports = router;
