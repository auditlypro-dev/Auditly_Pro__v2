const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

console.log("💳 USING AUDITLY PRO BILLING FILE");

// ==================================================
// CONFIGURATION
// ==================================================

const SHOPIFY_API_VERSION = "2026-07";

const SHOPIFY_API_KEY =
    process.env.SHOPIFY_API_KEY;

const SHOPIFY_API_SECRET =
    process.env.SHOPIFY_API_SECRET;

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const HOST =
    process.env.HOST ||
    "https://app.auditlypro.com";

const PLAN_NAME =
    "Auditly Pro";

const PLAN_PRICE =
    27;

const PLAN_CURRENCY =
    "USD";

const PLAN_INTERVAL =
    "EVERY_30_DAYS";

const TRIAL_DAYS =
    7;


// ==================================================
// SUPABASE
// ==================================================

const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    );


// ==================================================
// FIND SHOP
// ==================================================

async function getShop(shop) {

    const {
        data,
        error
    } = await supabase
        .from("shops")
        .select("*")
        .eq("shop", shop)
        .limit(1);

    if (error) {

        throw new Error(
            `Supabase lookup failed: ${error.message}`
        );

    }

    if (!data || data.length === 0) {

        return null;

    }

    return data[0];

}


// ==================================================
// REFRESH TOKEN
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

    console.log(
        "🔄 Refreshing Shopify token for billing:",
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
            "❌ BILLING TOKEN REFRESH FAILED:",
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


    const expiresAt =
        new Date(
            now +
            (
                tokenData.expires_in *
                1000
            )
        ).toISOString();


    let refreshTokenExpiresAt =
        shopRecord.refresh_token_expires_at;


    if (
        tokenData.refresh_token_expires_in
    ) {

        refreshTokenExpiresAt =
            new Date(
                now +
                (
                    tokenData.refresh_token_expires_in *
                    1000
                )
            ).toISOString();

    }


    const {
        error
    } = await supabase
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
        "✅ BILLING TOKEN REFRESHED"
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

}


// ==================================================
// GET VALID ACCESS TOKEN
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


    if (!shopRecord.expires_at) {

        throw new Error(
            "This shop does not have an expiring Shopify token."
        );

    }


    const expirationTime =
        new Date(
            shopRecord.expires_at
        ).getTime();


    const currentTime =
        Date.now();


    const refreshBuffer =
        5 * 60 * 1000;


    // Token still valid
    if (
        currentTime <
        (
            expirationTime -
            refreshBuffer
        )
    ) {

        return shopRecord.access_token;

    }


    console.log(
        "⏰ Billing token expired or nearly expired."
    );


    const refreshed =
        await refreshShopifyToken(
            shop,
            shopRecord
        );


    return refreshed.access_token;

}


// ==================================================
// SHOPIFY GRAPHQL
// ==================================================

async function shopifyGraphQL(
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

        throw new Error(
            `Shopify GraphQL HTTP error: ${response.status}`
        );

    }


    if (data.errors) {

        console.error(
            "❌ SHOPIFY GRAPHQL ERRORS:",
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
// GET SHOP SUBSCRIPTION STATUS
// ==================================================
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
                "💳 Checking billing status:",
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
                            "Shop not found"

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const query = `

                query GetAuditlySubscription {

                    currentAppInstallation {

                        activeSubscriptions {

                            id
                            name
                            status
                            createdAt
                            currentPeriodEnd
                            trialDays

                        }

                    }

                }

            `;


            const data =
                await shopifyGraphQL(
                    shop,
                    accessToken,
                    query
                );


            const installation =
                data?.data
                    ?.currentAppInstallation;


            const subscriptions =
                installation
                    ?.activeSubscriptions ||
                [];


            const auditlySubscription =
                subscriptions.find(
                    subscription =>
                        subscription.name ===
                        PLAN_NAME
                );


            const active =
                !!auditlySubscription;


            console.log(
                active
                    ? "✅ AUDITLY PRO SUBSCRIPTION ACTIVE"
                    : "ℹ️ AUDITLY PRO SUBSCRIPTION NOT ACTIVE"
            );


            return res.json({

                success: true,

                shop,

                active,

                status:
                    auditlySubscription
                        ?.status ||
                    "INACTIVE",

                plan:
                    auditlySubscription
                        ?.name ||
                    PLAN_NAME,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS,

                subscription:
                    auditlySubscription ||
                    null,

                subscriptions

            });


        } catch (error) {

            console.error(
                "❌ BILLING STATUS ERROR:",
                error.message
            );


            return res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Unable to check billing status",

                    details:
                        error.message

                });

        }

    }
);


// ==================================================
// START FREE TRIAL / CREATE SUBSCRIPTION
// ==================================================
// POST /billing/upgrade
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
                "💳 STARTING AUDITLY PRO TRIAL:",
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


            // ==================================================
            // FIRST CHECK FOR EXISTING SUBSCRIPTION
            // ==================================================

            const statusQuery = `

                query CheckExistingSubscription {

                    currentAppInstallation {

                        activeSubscriptions {

                            id
                            name
                            status
                            createdAt
                            currentPeriodEnd
                            trialDays

                        }

                    }

                }

            `;


            const statusData =
                await shopifyGraphQL(
                    shop,
                    accessToken,
                    statusQuery
                );


            const existingSubscriptions =
                statusData
                    ?.data
                    ?.currentAppInstallation
                    ?.activeSubscriptions ||
                [];


            const existingAuditlySubscription =
                existingSubscriptions.find(
                    subscription =>
                        subscription.name ===
                        PLAN_NAME
                );


            // ==================================================
            // ALREADY ACTIVE
            // ==================================================

            if (existingAuditlySubscription) {

                console.log(
                    "ℹ️ AUDITLY PRO ALREADY ACTIVE"
                );


                return res.json({

                    success: true,

                    active: true,

                    alreadySubscribed:
                        true,

                    message:
                        "Auditly Pro subscription is already active.",

                    subscription:
                        existingAuditlySubscription

                });

            }


            // ==================================================
            // CREATE SUBSCRIPTION
            // ==================================================

            const mutation = `

                mutation CreateAuditlySubscription(

                    $name: String!

                    $lineItems:
                        [AppSubscriptionLineItemInput!]!

                    $returnUrl: URL!

                    $trialDays: Int

                ) {

                    appSubscriptionCreate(

                        name: $name

                        returnUrl: $returnUrl

                        trialDays: $trialDays

                        lineItems: $lineItems

                    ) {

                        userErrors {

                            field
                            message

                        }

                        appSubscription {

                            id
                            name
                            status
                            createdAt
                            trialDays

                        }

                        confirmationUrl

                    }

                }

            `;


            const variables = {

                name:
                    PLAN_NAME,

                returnUrl:
                    `${HOST}/billing/callback?shop=${encodeURIComponent(shop)}`,

                trialDays:
                    TRIAL_DAYS,

                lineItems: [

                    {

                        plan: {

                            appRecurringPricingDetails: {

                                price: {

                                    amount:
                                        PLAN_PRICE,

                                    currencyCode:
                                        PLAN_CURRENCY

                                },

                                interval:
                                    PLAN_INTERVAL

                            }

                        }

                    }

                ]

            };


            console.log(
                "💳 CREATING SHOPIFY SUBSCRIPTION..."
            );


            const data =
                await shopifyGraphQL(
                    shop,
                    accessToken,
                    mutation,
                    variables
                );


            const result =
                data
                    ?.data
                    ?.appSubscriptionCreate;


            if (!result) {

                throw new Error(
                    "Shopify did not return a subscription response."
                );

            }


            // ==================================================
            // SHOPIFY USER ERRORS
            // ==================================================

            if (
                result.userErrors &&
                result.userErrors.length > 0
            ) {

                console.error(
                    "❌ SHOPIFY BILLING USER ERRORS:",
                    result.userErrors
                );


                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Shopify rejected the subscription.",

                        details:
                            result.userErrors

                    });

            }


            // ==================================================
            // CONFIRMATION URL
            // ==================================================

            if (
                !result.confirmationUrl
            ) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        error:
                            "Shopify did not return a billing confirmation URL."

                    });

            }


            console.log(
                "✅ AUDITLY PRO SUBSCRIPTION CREATED:",
                result
                    .appSubscription
                    ?.id
            );


            return res.json({

                success: true,

                active: false,

                approvalRequired:
                    true,

                message:
                    "Please approve your Auditly Pro subscription in Shopify.",

                plan:
                    PLAN_NAME,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS,

                interval:
                    PLAN_INTERVAL,

                subscriptionId:
                    result
                        .appSubscription
                        ?.id,

                confirmationUrl:
                    result.confirmationUrl

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
                        "Unable to create Shopify subscription",

                    details:
                        error.message

                });

        }

    }
);


// ==================================================
// BILLING CALLBACK
// ==================================================
// Shopify sends the merchant back here after approval.
// We verify the subscription instead of bli
