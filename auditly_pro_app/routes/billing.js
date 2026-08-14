const express = require("express");

const router = express.Router();

const { createClient } =
    require("@supabase/supabase-js");

console.log("💳 USING AUDITLY PRO BILLING FILE");

// ==========================================
// Configuration
// ==========================================

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

const TRIAL_DAYS =
    7;


// ==========================================
// Supabase
// ==========================================

const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    );


// ==========================================
// Find Shop
// ==========================================

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
            `Shopify billing request failed: ${response.status}`
        );

    }


    if (data.errors) {

        throw new Error(
            data.errors
                .map(error => error.message)
                .join("; ")
        );

    }


    return data;

}


// ==========================================
// Billing Status
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


            if (!shopRecord.access_token) {

                return res.json({
                    success: true,
                    shop,
                    active: false,
                    status:
                        "NOT_CONNECTED"
                });

            }


            const query = `

                query {

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
                    shopRecord.access_token,
                    query
                );


            const subscriptions =
                data.data
                    .currentAppInstallation
                    .activeSubscriptions || [];


            const active =
                subscriptions.length > 0;


            res.json({

                success: true,

                shop,

                active,

                status:
                    active
                        ? subscriptions[0].status
                        : "INACTIVE",

                subscriptions

            });


        } catch (error) {

            console.error(
                "❌ BILLING STATUS ERROR:",
                error.message
            );


            res
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


// ==========================================
// Create Subscription
// POST /billing/upgrade
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
                "💳 Starting billing upgrade for:",
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


            if (!shopRecord.access_token) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "No Shopify access token found."

                    });

            }


            // ======================================
            // Shopify Subscription
            // ======================================

            const mutation = `

                mutation CreateAuditlySubscription(
                    $name: String!,
                    $lineItems: [AppSubscriptionLineItemInput!]!,
                    $returnUrl: URL!,
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
                    shopRecord.access_token,
                    mutation,
                    variables
                );


            const result =
                data.data
                    .appSubscriptionCreate;


            // ======================================
            // Shopify Validation Errors
            // ======================================

            if (
                result.userErrors &&
                result.userErrors.length > 0
            ) {

                console.error(
                    "❌ BILLING USER ERRORS:",
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
                "✅ Shopify billing subscription created:",
                result.appSubscription?.id
            );


            // ======================================
            // Send Merchant to Shopify
            // ======================================

            res.json({

                success: true,

                message:
                    "Billing approval required.",

                plan:
                    PLAN_NAME,

                price:
                    "$27/month",

                trialDays:
                    TRIAL_DAYS,

                subscriptionId:
                    result.appSubscription?.id,

                confirmationUrl:
                    result.confirmationUrl

            });


        } catch (error) {

            console.error(
                "❌ BILLING UPGRADE ERROR:",
                error
            );


            res
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


// ==========================================
// Billing Callback
// GET /billing/callback
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
                    "Missing Shopify shop parameter."
                );

        }


        res.send(`

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

                <title>
                    Auditly Pro Billing
                </title>

            </head>

            <body>

                <h1>
                    🎉 Welcome to Auditly Pro!
                </h1>

                <p>
                    Your Shopify billing process
                    has returned to Auditly Pro.
                </p>

                <p>
                    We are checking your
                    subscription status.
                </p>

                <br>

                <a
                    href="/dashboard"
                >
                    Return to Auditly Pro
                </a>

            </body>

            </html>

        `);

    }
);


// ==========================================
// Billing Information
// GET /billing
// ==========================================

router.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            product:
                "Auditly Pro",

            plan:
                "Auditly Pro",

            price:
                "$27/month",

            trial:
                "7 days",

            billing:
                "Every 30 days",

            status:
                "Shopify Billing API Ready"

        });

    }
);


// ==========================================
// Export
// ==========================================

module.exports = router;
