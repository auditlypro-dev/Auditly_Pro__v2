const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

console.log("💳 USING AUDITLY PRO SHOPIFY APP PRICING BILLING FILE");

// ==================================================
// CONFIGURATION
// ==================================================

const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION || "2026-07";

const SHOPIFY_API_KEY =
    process.env.SHOPIFY_API_KEY;

const SHOPIFY_API_SECRET =
    process.env.SHOPIFY_API_SECRET;

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY;


// --------------------------------------------------
// Shopify App Pricing configuration
// --------------------------------------------------

const SHOPIFY_APP_HANDLE =
    process.env.SHOPIFY_APP_HANDLE ||
    "auditly-pro";

const SHOPIFY_APP_ID =
    process.env.SHOPIFY_APP_ID;

const SHOPIFY_PARTNER_ORG_ID =
    process.env.SHOPIFY_PARTNER_ORG_ID;

const SHOPIFY_PARTNER_API_ACCESS_TOKEN =
    process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN;

const SHOPIFY_PARTNER_API_VERSION =
    process.env.SHOPIFY_PARTNER_API_VERSION ||
    "2026-07";


// --------------------------------------------------
// Auditly Pro plan
// --------------------------------------------------

const PLAN_NAME =
    "Auditly Pro";

const PLAN_HANDLE =
    "auditly-pro";

const PLAN_PRICE =
    27;

const PLAN_CURRENCY =
    "USD";

const TRIAL_DAYS =
    7;


// ==================================================
// SUPABASE CLIENT
// ==================================================

if (!SUPABASE_URL) {

    console.error(
        "❌ SUPABASE_URL is missing."
    );

}

if (!SUPABASE_SERVICE_ROLE_KEY) {

    console.error(
        "❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY is missing."
    );

}

const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    );


// ==================================================
// ENVIRONMENT CHECK
// ==================================================

function checkPartnerApiConfiguration() {

    const missing = [];

    if (!SHOPIFY_PARTNER_ORG_ID) {
        missing.push(
            "SHOPIFY_PARTNER_ORG_ID"
        );
    }

    if (!SHOPIFY_PARTNER_API_ACCESS_TOKEN) {
        missing.push(
            "SHOPIFY_PARTNER_API_ACCESS_TOKEN"
        );
    }

    if (!SHOPIFY_APP_ID) {
        missing.push(
            "SHOPIFY_APP_ID"
        );
    }

    if (missing.length > 0) {

        throw new Error(
            `Missing Shopify Partner API environment variables: ${missing.join(", ")}`
        );

    }

}


// ==================================================
// FIND SHOP
//
// ==================================================

async function getShop(shop) {

    const {
        data,
        error
    } =
        await supabase
            .from("shops")
            .select("*")
            .eq("shop", shop)
            .limit(1);

    if (error) {

        throw new Error(
            `Supabase lookup failed: ${error.message}`
        );

    }

    if (
        !data ||
        data.length === 0
    ) {

        return null;

    }

    return data[0];

}


// ==================================================
// REFRESH SHOPIFY ACCESS TOKEN
// ==================================================

async function refreshShopifyToken(
    shop,
    shopRecord
) {

    if (!shopRecord.refresh_token) {

        throw new Error(
            "No Shopify refresh token is stored for this shop."
        );

    }

    if (
        !SHOPIFY_API_KEY ||
        !SHOPIFY_API_SECRET
    ) {

        throw new Error(
            "Shopify API credentials are missing."
        );

    }

    console.log(
        "🔄 Refreshing Shopify token:",
        shop
    );


    const response =
        await fetch(
            `https://${shop}/admin/oauth/access_token`,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded",

                    "Accept":
                        "application/json"

                },

                body:
                    new URLSearchParams({

                        client_id:
                            SHOPIFY_API_KEY,

                        client_secret:
                            SHOPIFY_API_SECRET,

                        grant_type:
                            "refresh_token",

                        refresh_token:
                            shopRecord.refresh_token

                    }).toString()

            }
        );


    const tokenData =
        await response.json();


    if (!response.ok) {

        console.error(
            "❌ SHOPIFY TOKEN REFRESH FAILED:",
            tokenData
        );

        throw new Error(
            tokenData.error_description ||
            tokenData.error ||
            "Shopify token refresh failed."
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


    const now =
        Date.now();


    const expiresIn =
        Number(
            tokenData.expires_in || 0
        );


    const expiresAt =
        expiresIn > 0
            ? new Date(
                now +
                expiresIn * 1000
            ).toISOString()
            : null;


    let refreshTokenExpiresAt =
        shopRecord.refresh_token_expires_at ||
        null;


    if (
        tokenData.refresh_token_expires_in
    ) {

        refreshTokenExpiresAt =
            new Date(
                now +
                Number(
                    tokenData.refresh_token_expires_in
                ) * 1000
            ).toISOString();

    }


    const {
        error
    } =
        await supabase
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
            .eq(
                "shop",
                shop
            );


    if (error) {

        throw new Error(
            `Unable to save refreshed token: ${error.message}`
        );

    }


    console.log(
        "✅ SHOPIFY TOKEN REFRESHED"
    );


    return tokenData.access_token;

}


// ==================================================
// GET VALID SHOPIFY ACCESS TOKEN
// ==================================================

async function getValidAccessToken(
    shop,
    shopRecord
) {

    if (!shopRecord.access_token) {

        throw new Error(
            "No Shopify access token is stored for this shop."
        );

    }


    // Some older records may not have expiration data.
    // In that case, use the stored token rather than
    // breaking the billing status request.

    if (!shopRecord.expires_at) {

        console.log(
            "ℹ️ No token expiration stored; using existing access token."
        );

        return shopRecord.access_token;

    }


    const expirationTime =
        new Date(
            shopRecord.expires_at
        ).getTime();


    if (
        !Number.isFinite(
            expirationTime
        )
    ) {

        return shopRecord.access_token;

    }


    const currentTime =
        Date.now();


    const refreshBuffer =
        5 * 60 * 1000;


    if (
        currentTime <
        expirationTime - refreshBuffer
    ) {

        return shopRecord.access_token;

    }


    return await refreshShopifyToken(
        shop,
        shopRecord
    );

}


// ==================================================
// SHOPIFY ADMIN GRAPHQL
// ==================================================

async function shopifyAdminGraphQL(
    shop,
    accessToken,
    query,
    variables = {}
) {

    const response =
        await fetch(
            `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json",

                    "X-Shopify-Access-Token":
                        accessToken

                },

                body:
                    JSON.stringify({

                        query,

                        variables

                    })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "❌ SHOPIFY ADMIN GRAPHQL HTTP ERROR:",
            response.status,
            data
        );

        throw new Error(
            `Shopify Admin API error: ${response.status}`
        );

    }


    if (data.errors) {

        console.error(
            "❌ SHOPIFY ADMIN GRAPHQL ERRORS:",
            data.errors
        );

        throw new Error(
            data.errors
                .map(
                    error =>
                        error.message
                )
                .join("; ")
        );

    }


    return data;

}


// ==================================================
// GET SHOP GID
// ==================================================

async function getShopGid(
    shop,
    accessToken
) {

    const query = `

        query GetShopId {

            shop {

                id

            }

        }

    `;


    const data =
        await shopifyAdminGraphQL(
            shop,
            accessToken,
            query
        );


    const shopId =
        data
            ?.data
            ?.shop
            ?.id;


    if (!shopId) {

        throw new Error(
            "Shopify did not return the shop ID."
        );

    }


    return shopId;

}


// ==================================================
// SHOPIFY PARTNER API
// ==================================================

async function shopifyPartnerGraphQL(
    query,
    variables = {}
) {

    checkPartnerApiConfiguration();


    const url =
        `https://partners.shopify.com/${SHOPIFY_PARTNER_ORG_ID}/api/${SHOPIFY_PARTNER_API_VERSION}/graphql.json`;


    const response =
        await fetch(
            url,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json",

                    "X-Shopify-Access-Token":
                        SHOPIFY_PARTNER_API_ACCESS_TOKEN

                },

                body:
                    JSON.stringify({

                        query,

                        variables

                    })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "❌ SHOPIFY PARTNER API HTTP ERROR:",
            response.status,
            data
        );

        throw new Error(
            `Shopify Partner API error: ${response.status}`
        );

    }


    if (data.errors) {

        console.error(
            "❌ SHOPIFY PARTNER API ERRORS:",
            data.errors
        );

        throw new Error(
            data.errors
                .map(
                    error =>
                        error.message
                )
                .join("; ")
        );

    }


    return data;

}


// ==================================================
// GET SHOPIFY APP PRICING SUBSCRIPTION
// ==================================================

async function getAppPricingSubscription(
    shopId
) {

    const query = `

        query ActiveSubscription(
            $appId: ID!
            $shopId: ID!
        ) {

            activeSubscription(
                appId: $appId
                shopId: $shopId
            ) {

                billingPeriod

                cancelAtEndOfCycle

                trialEndsAt

                currentBillingCycle {

                    startTime

                    endTime

                }

                items {

                    handle

                    description

                    price {

                        __typename

                        active

                        currency

                        ... on FlatRatePrice {

                            amount

                        }

                    }

                }

            }

        }

    `;


    const data =
        await shopifyPartnerGraphQL(
            query,
            {

                appId:
                    SHOPIFY_APP_ID,

                shopId:
                    shopId

            }
        );


    return (
        data
            ?.data
            ?.activeSubscription ||
        null
    );

}


// ==================================================
// BUILD SHOPIFY APP PRICING URL
// ==================================================

function getPricingUrl(
    shop
) {

    if (!shop) {

        throw new Error(
            "Missing Shopify shop domain."
        );

    }


    if (
        !shop.endsWith(
            ".myshopify.com"
        )
    ) {

        throw new Error(
            "Invalid Shopify shop domain."
        );

    }


    const storeHandle =
        shop.replace(
            ".myshopify.com",
            ""
        );


    return (
        `https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}` +
        `/charges/${encodeURIComponent(SHOPIFY_APP_HANDLE)}` +
        `/pricing_plans`
    );

}


// ==================================================
// BILLING STATUS
// GET /billing/status?shop=...
// ==================================================

router.get(
    "/status",
    async (req, res) => {

        try {

            const shop =
                req.query.shop;


            if (!shop) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Missing shop parameter"

                    });

            }


            console.log(
                "💳 Checking Shopify App Pricing:",
                shop
            );


            const shopRecord =
                await getShop(shop);


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found. Connect Shopify first."

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const shopId =
                await getShopGid(
                    shop,
                    accessToken
                );


            const subscription =
                await getAppPricingSubscription(
                    shopId
                );


            const active =
                !!subscription;


            let planHandle =
                null;


            if (
                subscription &&
                subscription.items &&
                subscription.items.length > 0
            ) {

                planHandle =
                    subscription
                        .items[0]
                        .handle ||
                    null;

            }


            console.log(
                active
                    ? "✅ AUDITLY PRO APP PRICING ACTIVE"
                    : "ℹ️ AUDITLY PRO APP PRICING NOT ACTIVE"
            );


            return res.json({

                success: true,

                shop,

                shopId,

                active,

                plan:
                    active
                        ? PLAN_NAME
                        : null,

                planHandle:

                    planHandle,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS,

                subscription:
                    subscription

            });

        } catch (error) {

            console.error(
                "❌ BILLING STATUS ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Unable to check Shopify App Pricing subscription.",

                    details:
                        error.message

                });

        }

    }
);


// ==================================================
// START / UPGRADE
// GET /billing/upgrade?shop=...
//
// IMPORTANT:
// This does NOT create a subscription.
//
// It redirects the merchant to Shopify's
// hosted App Pricing page.
// ==================================================

    // ==================================================
// GET /billing/upgrade?shop=...
//
// Opens Shopify's hosted App Pricing page.
// This route does NOT create a subscription.
// ==================================================

router.get(
    "/upgrade",
    async (req, res) => {

        try {

            const shop =
                req.query.shop;

            if (!shop) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Missing shop parameter"
                    });

            }

            if (!shop.endsWith(".myshopify.com")) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Invalid Shopify shop domain."
                    });

            }

            console.log(
                "💳 OPENING AUDITLY PRO SHOPIFY APP PRICING:",
                shop
            );

            const shopRecord =
                await getShop(shop);

            if (!shopRecord) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            "Shop not found. Connect Shopify first."
                    });

            }

            // --------------------------------------------------
            // Do NOT call the Partner API here.
            // Simply send the merchant to Shopify's hosted
            // App Pricing page.
            // --------------------------------------------------

            const pricingUrl =
                getPricingUrl(shop);

            console.log(
                "➡️ REDIRECTING TO SHOPIFY APP PRICING:",
                pricingUrl
            );

            return res.redirect(
                pricingUrl
            );

        } catch (error) {

            console.error(
                "❌ BILLING UPGRADE ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Unable to open Shopify App Pricing.",
                    details:
                        error.message
                });

        }

    }
);                    


// ==================================================
// POST /billing/upgrade
//
// Kept for compatibility with the current
// Auditly Pro dashboard if it sends POST.
// ==================================================

router.post(
    "/upgrade",
    async (req, res) => {

        try {

            const shop =
                req.query.shop ||
                req.body?.shop;


            if (!shop) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Missing shop parameter"

                    });

            }


            console.log(
                "💳 POST BILLING UPGRADE REQUEST:",
                shop
            );


            const shopRecord =
                await getShop(shop);


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found. Connect Shopify first."

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const shopId =
                await getShopGid(
                    shop,
                    accessToken
                );


            const subscription =
                await getAppPricingSubscription(
                    shopId
                );


            if (subscription) {

                return res.json({

                    success: true,

                    active: true,

                    alreadySubscribed:
                        true,

                    message:
                        "Auditly Pro is already active.",

                    subscription:
                        subscription

                });

            }


            const pricingUrl =
                getPricingUrl(shop);


            return res.json({

                success: true,

                active: false,

                redirect: true,

                pricingUrl:

                    pricingUrl,

                plan:
                    PLAN_NAME,

                planHandle:
                    PLAN_HANDLE,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS

            });

        } catch (error) {

            console.error(
                "❌ BILLING UPGRADE ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Unable to open Shopify App Pricing.",

                    details:
                        error.message

                });

        }

    }
);


// ==================================================
// BILLING CALLBACK / WELCOME ROUTE
//
// Shopify App Pricing sends the merchant back
// to the plan's configured redirect URL.
//
// Your plan currently uses:
//
// /
//
// Your server's "/" route redirects to /dashboard.
//
// This endpoint is also provided in case you later
// configure the plan to use /billing/callback.
// ==================================================

router.get(
    "/callback",
    async (req, res) => {

        try {

            const shop =
                req.query.shop;

            const planHandle =
                req.query.plan_handle;


            console.log(
                "🔔 SHOPIFY APP PRICING CALLBACK"
            );

            console.log(
                "Shop:",
                shop
            );

            console.log(
                "Plan handle:",
                planHandle
            );


            if (!shop) {

                return res
                    .status(400)
                    .send(
                        "Missing Shopify shop parameter."
                    );

            }


            const shopRecord =
                await getShop(shop);


            if (!shopRecord) {

                return res
                    .status(404)
                    .send(
                        "Shop not found."
                    );

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const shopId =
                await getShopGid(
                    shop,
                    accessToken
                );


            const subscription =
                await getAppPricingSubscription(
                    shopId
                );


            if (!subscription) {

                console.log(
                    "⚠️ CALLBACK RETURNED WITHOUT ACTIVE SUBSCRIPTION"
                );

                return res.redirect(
                    `/dashboard?shop=${encodeURIComponent(shop)}`
                );

            }


            console.log(
                "✅ AUDITLY PRO SUBSCRIPTION CONFIRMED"
            );


            return res.redirect(
                `/dashboard?shop=${encodeURIComponent(shop)}&plan_handle=${encodeURIComponent(planHandle || PLAN_HANDLE)}`
            );

        } catch (error) {

            console.error(
                "❌ BILLING CALLBACK ERROR:",
                error
            );


            return res
                .status(500)
                .send(
                    "Unable to verify Auditly Pro subscription."
                );

        }

    }
);


// ==================================================
// EXPORT
// ==================================================

module.exports =
    router;
