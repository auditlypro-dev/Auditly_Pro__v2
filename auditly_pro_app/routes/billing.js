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
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY;

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
// SUPABASE CLIENT
// ==================================================

if (!SUPABASE_URL) {

    console.error(
        "❌ SUPABASE_URL is missing."
    );

}

if (!SUPABASE_SERVICE_ROLE_KEY) {

    console.error(
        "❌ SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) is missing."
    );

}

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
// REFRESH SHOPIFY TOKEN
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
            "Shopify API credentials are missing from the server environment."
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


    const expiresIn =
        Number(
            tokenData.expires_in || 0
        );


    const expiresAt =
        expiresIn > 0
            ? new Date(
                now +
                expiresIn *
                1000
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
                ) *
                1000
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


    if (!shopRecord.expires_at) {

        throw new Error(
            "This shop does not have an expiring Shopify token."
        );

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

        throw new Error(
            "The stored Shopify token expiration date is invalid."
        );

    }


    const currentTime =
        Date.now();


    // Refresh five minutes before expiration.

    const refreshBuffer =
        5 *
        60 *
        1000;


    if (
        currentTime <
        (
            expirationTime -
            refreshBuffer
        )
    ) {

        console.log(
            "🔑 Valid Shopify access token ready"
        );

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
// SHOPIFY GRAPHQL HELPER
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
            "❌ SHOPIFY GRAPHQL HTTP ERROR:",
            response.status,
            data
        );

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
// GET AUDITLY PRO SUBSCRIPTION
// ==================================================

async function getAuditlySubscription(
    shop,
    accessToken
) {

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


    const subscriptions =
        data
            ?.data
            ?.currentAppInstallation
            ?.activeSubscriptions ||
        [];


    const subscription =
        subscriptions.find(
            item =>
                item.name ===
                PLAN_NAME
        ) ||
        null;


    return {

        subscription,

        subscriptions

    };

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


            const {
                subscription,
                subscriptions
            } =
                await getAuditlySubscription(
                    shop,
                    accessToken
                );


            const active =
                !!subscription;


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
                    subscription
                        ?.status ||
                    "INACTIVE",

                plan:
                    subscription
                        ?.name ||
                    PLAN_NAME,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS,

                subscription:
                    subscription ||
                    null,

                subscriptions

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
                        "Unable to check billing status",

                    details:
                        error.message

                });

        }

    }
);


// ==================================================
// START 7-DAY FREE TRIAL
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
            // CHECK EXISTING ACTIVE SUBSCRIPTION
            // ==================================================

            const {
                subscription:
                    existingSubscription
            } =
                await getAuditlySubscription(
                    shop,
                    accessToken
                );


            if (existingSubscription) {

                console.log(
                    "ℹ️ AUDITLY PRO ALREADY ACTIVE:",
                    existingSubscription.id
                );


                return res.json({

                    success: true,

                    active: true,

                    alreadySubscribed:
                        true,

                    message:
                        "Auditly Pro subscription is already active.",

                    subscription:
                        existingSubscription

                });

            }


            // ==================================================
            // CREATE SHOPIFY SUBSCRIPTION
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

                        name:
                            $name

                        returnUrl:
                            $returnUrl

                        trialDays:
                            $trialDays

                        lineItems:
                            $lineItems

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


            const returnUrl =
                `${HOST}/billing/callback?shop=${encodeURIComponent(shop)}`;


            const variables = {

                name:
                    PLAN_NAME,

                returnUrl:
                    returnUrl,

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


            console.log(
                "💰 Plan:",
                `$${PLAN_PRICE}/month`
            );


            console.log(
                "🎁 Trial:",
                `${TRIAL_DAYS} days`
            );


            console.log(
                "↩️ Return URL:",
                returnUrl
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

                console.error(
                    "❌ SHOPIFY DID NOT RETURN CONFIRMATION URL"
                );


                return res
                    .status(500)
                    .json({

                        success: false,

                        error:
                            "Shopify did not return a billing confirmation URL."

                    });

            }


            // ==================================================
            // SUCCESSFUL SUBSCRIPTION CREATION
            // ==================================================

        
            if (
                !result.confirmationUrl
            ) {

                console.error(
                    "❌ SHOPIFY DID NOT RETURN CONFIRMATION URL"
                );


                return res
                    .status(500)
                    .json({

                        success: false,

                        error:
                            "Shopify did not return a billing confirmation URL."

                    });

            }


            // ==================================================
            // SUCCESSFUL SUBSCRIPTION CREATION
            // ==================================================

            console.log(
                "✅ AUDITLY PRO SUBSCRIPTION CREATED:",
                result
                    .appSubscription
                    ?.id
            );


            console.log(
                "🔗 SHOPIFY BILLING CONFIRMATION URL:",
                result.confirmationUrl
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
// GET /billing/callback?shop=...
// ==================================================

router.get(
    "/callback",
    async (req, res) => {

        try {

            const shop =
                req.query.shop;


            if (!shop) {

                return res
                    .status(400)
                    .send(
                        "Missing Shopify shop parameter."
                    );

            }


            console.log(
                "💳 BILLING CALLBACK:",
                shop
            );


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


            const {
                subscription
            } =
                await getAuditlySubscription(
                    shop,
                    accessToken
                );

            const dashboardUrl =
                `/dashboard?shop=${encodeURIComponent(shop)}`;


            // ==================================================
            // SUBSCRIPTION VERIFIED
            // ==================================================

            if (subscription) {

                console.log(
                    "🎉 AUDITLY PRO SUBSCRIPTION VERIFIED:",
                    subscription.id
                );


                return res.send(`

                    <!DOCTYPE html>

                    <html lang="en">

                    <head>

                        <meta charset="UTF-8">

                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1.0"
                        >

                        <title>
                            Auditly Pro
                        </title>

                    </head>

                    <body>

                        <h1>
                            🎉 Welcome to Auditly Pro!
                        </h1>

                        <h2>
                            Your subscription is active.
                        </h2>

                        <p>
                            Your 7-day free trial has started.
                        </p>

                        <p>
                            After the trial, your plan will be
                            $27/month unless cancelled.
                        </p>

                        <br>

                        <a href="${dashboardUrl}">
                            Return to Auditly Pro
                        </a>

                    </body>

                    </html>

                `);

            }


            // ==================================================
            // APPROVAL NOT ACTIVE
            // ==================================================

            console.log(
                "ℹ️ BILLING APPROVAL NOT ACTIVE:",
                shop
            );


            return res.send(`

                <!DOCTYPE html>

                <html lang="en">

                <head>

                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    >

                    <title>
                        Auditly Pro
                    </title>

                </head>

                <body>

                    <h1>
                        Billing Approval Pending
                    </h1>

                    <p>
                        Shopify has not yet reported an active
                        Auditly Pro subscription.
                    </p>

                    <p>
                        If you approved the subscription,
                        please wait a moment and try again.
                    </p>

                    <br>

                    <a href="${dashboardUrl}">
                        Return to Auditly Pro
                    </a>

                </body>

                </html>

            `);


        } catch (error) {

            console.error(
                "❌ BILLING CALLBACK ERROR:",
                error
            );


            return res
                .status(500)
                .send(`

                    <!DOCTYPE html>

                    <html lang="en">

                    <head>

                        <meta charset="UTF-8">

                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1.0"
                        >

                        <title>
                            Auditly Pro Billing Error
                        </title>

                    </head>

                    <body>

                        <h1>
                            Billing verification failed
                        </h1>


                        <p>
                            Auditly Pro could not verify
                            your Shopify subscription.
                        </p>

                        <p>
                            Please try returning to
                            Auditly Pro.
                        </p>

                        <br>

                        <a href="/dashboard">
                            Return to Auditly Pro
                        </a>

                    </body>

                    </html>

                `);

        }

    }
);


// ==================================================
// BILLING INFORMATION
// GET /billing
// ==================================================

router.get(
    "/",
    (req, res) => {

        return res.json({

            success: true,

            product:
                "Auditly Pro",

            plan:
                PLAN_NAME,

            price:
                "$27/month",

            currency:
                PLAN_CURRENCY,

            billing:
                "Every 30 days",

            trial:
                "7 days",

            billingProvider:
                "Shopify Billing API",

            apiVersion:
                SHOPIFY_API_VERSION,

            status:
                "READY"

        });

    }
);


// ==================================================
// EXPORT ROUTER
// ==================================================

module.exports = router;
