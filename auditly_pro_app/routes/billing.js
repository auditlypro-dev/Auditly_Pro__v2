const express = require("express");

const router = express.Router();

console.log("🔥 BILLING ROUTER LOADED");

// ==========================================
// Auditly Pro v2
// Shopify Billing
// ==========================================

const SHOPIFY_API_VERSION = "2026-07";

const SHOPIFY_API_KEY =
    process.env.SHOPIFY_API_KEY;

const SHOPIFY_API_SECRET =
    process.env.SHOPIFY_API_SECRET;

const APP_URL =
    process.env.HOST ||
    "https://app.auditlypro.com";


// ==========================================
// Configuration
// ==========================================

const PLAN_NAME =
    "Auditly Pro";

const PLAN_PRICE =
    27;

const TRIAL_DAYS =
    7;


// ==========================================
// Shopify GraphQL
// ==========================================

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


// ==========================================
// GET SHOP RECORD
// ==========================================

async function getShopRecord(shop) {

    const {
        data,
        error
    } = await require("@supabase/supabase-js")
        .createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        .from("shops")
        .select("*")
        .eq("shop", shop)
        .limit(1);


    if (error) {

        throw new Error(
            `Supabase shop lookup failed: ${error.message}`
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


// ==========================================
// GET VALID ACCESS TOKEN
// ==========================================
//
// This uses the same token fields that your
// working api.js already uses.
//
// ==========================================

async function getValidAccessToken(
    shop,
    shopRecord
) {

    if (
        !shopRecord ||
        !shopRecord.access_token
    ) {

        throw new Error(
            "No Shopify access token is stored for this shop."
        );

    }


    if (
        !shopRecord.expires_at
    ) {

        throw new Error(
            "This shop does not have an expiring Shopify token. Reinstall the app."
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


    if (
        currentTime <
        (
            expirationTime -
            refreshBuffer
        )
    ) {

        return shopRecord.access_token;

    }


    // ------------------------------------------
    // Refresh token
    // ------------------------------------------

    if (
        !shopRecord.refresh_token
    ) {

        throw new Error(
            "Shopify access token has expired and no refresh token is available."
        );

    }


    console.log(
        "🔄 Refreshing Shopify billing access token..."
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

        throw new Error(
            tokenData.error_description ||
            tokenData.error ||
            "Shopify token refresh failed."
        );

    }


    if (
        !tokenData.access_token
    ) {

        throw new Error(
            "Shopify did not return a new access token."
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


    const refreshTokenExpiresAt =
        tokenData.refresh_token_expires_in
            ? new Date(
                now +
                (
                    tokenData.refresh_token_expires_in *
                    1000
                )
            ).toISOString()
            : shopRecord.refresh_token_expires_at;


    const supabase =
        require("@supabase/supabase-js")
            .createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );


    const {
        error
    } = await supabase
        .from("shops")
        .update({

            access_token:
                tokenData.access_token,

            refresh_token:
                tokenData.refresh_token ||
                shopRecord.refresh_token,

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
            `Unable to save refreshed Shopify token: ${error.message}`
        );

    }


    return tokenData.access_token;

}


// ==========================================
// BILLING STATUS
// GET /billing/status?shop=...
// ==========================================

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


            const shopRecord =
                await getShopRecord(
                    shop
                );


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found",

                        shop

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const query = `

                query {

                    currentAppInstallation {

                        activeSubscriptions {

                            id
                            name
                            status

                            trialDays

                            createdAt

                            currentPeriodEnd

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
                    .data
                    .currentAppInstallation
                    .activeSubscriptions || [];


            const activeSubscription =
                subscriptions.find(
                    subscription =>
                        subscription.status ===
                        "ACTIVE"
                );


            res.json({

                success: true,

                shop,

                subscribed:
                    Boolean(
                        activeSubscription
                    ),

                plan:
                    activeSubscription
                        ? activeSubscription.name
                        : null,

                subscription:
                    activeSubscription ||
                    null

            });

        } catch (error) {

            console.error(
                "❌ Billing status error:",
                error.message
            );


            res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Unable to retrieve billing status",

                    details:
                        error.message

                });

        }

    }
);


// ==========================================
// CREATE SUBSCRIPTION
// POST /billing/upgrade?shop=...
// ==========================================

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
                "💳 Creating Auditly Pro subscription for:",
                shop
            );


            const shopRecord =
                await getShopRecord(
                    shop
                );


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found",

                        shop

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            // ------------------------------------------
            // Shopify subscription mutation
            // ------------------------------------------

            const mutation = `

                mutation AppSubscriptionCreate(
                    $name: String!
                    $lineItems: [AppSubscriptionLineItemInput!]!
                    $returnUrl: URL!
                    $trialDays: Int
                ) {

                    appSubscriptionCreate(

                        name: $name

                        returnUrl: $returnUrl

                        lineItems: $lineItems

                        trialDays: $trialDays

                    ) {

                        userErrors {

                            field
                            message

                        }

                        appSubscription {

                            id
                            name
                            status

                        }

                        confirmationUrl

                    }

                }

            `;


            const returnUrl =
                `${APP_URL}/billing/callback?shop=${encodeURIComponent(shop)}`;


            const variables = {

                name:
                    PLAN_NAME,

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
                                        "USD"

                                },

                                interval:
                                    "EVERY_30_DAYS"

                            }

                        }

                    }

                ]

            };


            const data =
                await shopifyGraphQL(
                    shop,
                    accessToken,
                    mutation,
                    variables
                );


            const billing =
                data
                    .data
                    .appSubscriptionCreate;


            // ------------------------------------------
            // Shopify reported an error
            // ------------------------------------------

            if (
                billing.userErrors &&
                billing.userErrors.length > 0
            ) {

                console.error(
                    "❌ Shopify billing errors:",
                    billing.userErrors
                );


                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Shopify could not create the subscription.",

                        details:
                            billing.userErrors

                    });

            }


            if (
                !billing.confirmationUrl
            ) {

                throw new Error(
                    "Shopify did not return a billing confirmation URL."
                );

            }


            console.log(
                "✅ Shopify billing confirmation URL created"
            );


            res.json({

                success: true,

                plan:
                    PLAN_NAME,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS,

                subscriptionId:
                    billing
                        .appSubscription
                        ?.id || null,

                confirmationUrl:
                    billing.confirmationUrl

            });

        } catch (error) {

            console.error(
                "❌ Billing upgrade error:",
                error
            );


            res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Unable to start Shopify subscription",

                    details:
                        error.message

                });

        }

    }
);


// ==========================================
// BILLING CALLBACK
// GET /billing/callback?shop=...
// ==========================================

router.get(
    "/callback",
    async (req, res) => {

        const shop =
            req.query.shop;


        if (!shop) {

            return res
                .status(400)
                .send(
                    "Missing shop parameter."
                );

        }


        console.log(
            "✅ Returned from Shopify billing:",
            shop
        );


        res.send(`

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <title>
                    Auditly Pro Billing
                </title>

            </head>

            <body style="
                font-family:Arial,sans-serif;
                max-width:600px;
                margin:60px auto;
                padding:20px;
                text-align:center;
            ">

                <h1>
                    🚀 Auditly Pro
                </h1>

                <h2>
                    Billing Setup Complete
                </h2>

                <p>
                    Shopify has returned you to Auditly Pro.
                </p>

                <p>
                    You can now return to your
                    Auditly Pro dashboard.
                </p>

                <p>
                    <a href="/">
                        Return to Auditly Pro
                    </a>
                </p>

            </body>

            </html>

        `);

    }
);


// ==========================================
// GET BILLING PLAN INFORMATION
// GET /billing/
// ==========================================

router.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            plan:
                PLAN_NAME,

            price:
                "$27/month",

            interval:
                "EVERY_30_DAYS",

            trialDays:
                TRIAL_DAYS,

            status:
                "Available"

        });

    }
);


// ==========================================
// EXPORT
// ==========================================

module.exports = router;
