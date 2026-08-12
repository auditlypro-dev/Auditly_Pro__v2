// ==========================================
// Auditly Pro v2
// Shopify + Supabase API Routes
// ==========================================

const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

console.log("🔥 USING FINAL SUPABASE API FILE");


// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION || "2026-07";

const SHOPIFY_API_KEY =
    process.env.SHOPIFY_API_KEY;

const SHOPIFY_API_SECRET =
    process.env.SHOPIFY_API_SECRET;

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY;


// ==========================================
// ENVIRONMENT CHECK
// ==========================================

if (!SUPABASE_URL) {
    console.error("❌ SUPABASE_URL is missing");
}

if (!SUPABASE_KEY) {
    console.error("❌ SUPABASE service key is missing");
}

if (!SHOPIFY_API_KEY) {
    console.error("❌ SHOPIFY_API_KEY is missing");
}

if (!SHOPIFY_API_SECRET) {
    console.error("❌ SHOPIFY_API_SECRET is missing");
}


// ==========================================
// SUPABASE CLIENT
// ==========================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==========================================
// TOKEN REFRESH LOCKS
// ==========================================

const refreshLocks = new Map();


// ==========================================
// FIND SHOP IN SUPABASE
// ==========================================

async function getShopRecord(shop) {

    const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("shop", shop)
        .limit(1);

    if (error) {

        console.error(
            "❌ SUPABASE SHOP LOOKUP ERROR:",
            error
        );

        throw new Error(
            `Supabase shop lookup failed: ${error.message}`
        );
    }

    if (!data || data.length === 0) {
        return null;
    }

    return data[0];
}


// ==========================================
// REFRESH SHOPIFY EXPIRING TOKEN
// ==========================================

async function refreshShopifyToken(
    shop,
    shopRecord
) {

    // Prevent multiple simultaneous refreshes.
    if (refreshLocks.has(shop)) {

        return await refreshLocks.get(shop);

    }


    const refreshPromise = (async () => {

        console.log(
            "🔄 Refreshing Shopify token for:",
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


        // --------------------------------------
        // Calculate expiration times
        // --------------------------------------

        const now =
            Date.now();


        const expiresAt =
            new Date(
                now +
                (tokenData.expires_in * 1000)
            ).toISOString();


        const refreshTokenExpiresAt =
            tokenData.refresh_token_expires_in

                ? new Date(
                    now +
                    (
                        tokenData.refresh_token_expires_in
                        * 1000
                    )
                ).toISOString()

                : shopRecord.refresh_token_expires_at;


        // --------------------------------------
        // Save new tokens
        // --------------------------------------

        const { error } = await supabase

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

            .eq("shop", shop);


        if (error) {

            console.error(
                "❌ FAILED TO SAVE REFRESHED TOKEN:",
                error
            );

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


    refreshLocks.set(
        shop,
        refreshPromise
    );


    try {

        return await refreshPromise;

    } finally {

        refreshLocks.delete(shop);

    }

}


// ==========================================
// GET VALID SHOPIFY ACCESS TOKEN
// ==========================================

async function getValidAccessToken(
    shop,
    shopRecord
) {

    if (!shopRecord.access_token) {

        throw new Error(
            "No Shopify access token is stored for this shop."
        );

    }


    // --------------------------------------
    // Expiring-token architecture
    // --------------------------------------

    if (!shopRecord.expires_at) {

        throw new Error(
            "This shop does not have an expiring Shopify token. Reinstall the app to obtain a current expiring offline token."
        );

    }


    const expirationTime =
        new Date(
            shopRecord.expires_at
        ).getTime();


    if (Number.isNaN(expirationTime)) {

        throw new Error(
            "The Shopify token expiration date is invalid."
        );

    }


    const currentTime =
        Date.now();


    // Refresh five minutes before expiration.
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


// ==========================================
// SHOPIFY GRAPHQL REQUEST
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

                body: JSON.stringify({

                    query,

                    variables

                })

            }

        );


    let data;


    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Shopify returned an invalid response."
        );

    }


    if (!response.ok) {

        const error =
            new Error(
                `Shopify GraphQL HTTP error: ${response.status}`
            );

        error.status =
            response.status;

        error.details =
            data;

        throw error;

    }


    if (data.errors) {

        console.error(
            "❌ SHOPIFY GRAPHQL ERRORS:",
            data.errors
        );


        const error =
            new Error(

                data.errors
                    .map(
                        item => item.message
                    )
                    .join("; ")

            );


        error.status =
            200;

        error.details =
            data.errors;


        throw error;

    }


    return data;

}


// ==========================================
// GET STORE INFORMATION
// ==========================================

router.get(
    "/store",
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
                "🔎 Looking up shop in Supabase:",
                shop
            );


            // ----------------------------------
            // Get store from Supabase
            // ----------------------------------

            const shopRecord =
                await getShopRecord(shop);


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found in Supabase",

                        shop

                    });

            }


            console.log(
                "✅ Shop found in Supabase"
            );


            // ----------------------------------
            // Get valid access token
            // ----------------------------------

            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            console.log(
                "🔑 Valid Shopify access token ready"
            );


            // ----------------------------------
            // Shopify GraphQL query
            // ----------------------------------

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


            res.json({

                success: true,

                shop: store

            });


        } catch (error) {

            console.error(
                "❌ /api/store ERROR:",
                error
            );


            res
                .status(
                    error.status || 500
                )
                .json({

                    success: false,

                    error:
                        "Unable to retrieve Shopify store data",

                    details:
                        error.message

                });

        }

    }
);


// ==========================================
// GET SHOPIFY PRODUCTS
// ==========================================

router.get(
    "/products",
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
                await getShopRecord(shop);


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found in Supabase"

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const query = `

                query {

                    products(first: 50) {

                        nodes {

                            id

                            title

                            handle

                            status

                            description

                            totalInventory

                            onlineStoreUrl

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


            res.json({

                success: true,

                shop,

                products:
                    data.data.products.nodes

            });


        } catch (error) {

            console.error(
                "❌ /api/products ERROR:",
                error
            );


            res
                .status(
                    error.status || 500
                )
                .json({

                    success: false,

                    error:
                        "Unable to retrieve Shopify products",

                    details:
                        error.message

                });

        }

    }
);


// ==========================================
// GET SHOPIFY THEMES
// ==========================================

router.get(
    "/themes",
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
                await getShopRecord(shop);


            if (!shopRecord) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Shop not found in Supabase"

                    });

            }


            const accessToken =
                await getValidAccessToken(
                    shop,
                    shopRecord
                );


            const query = `

                query {

                    themes(first: 20) {

                        nodes {

                            id

                            name

                            role

                            createdAt

                            updatedAt

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


            res.json({

                success: true,

                shop,

                themes:
                    data.data.themes.nodes

            });


        } catch (error) {

            console.error(
                "❌ /api/themes ERROR:",
                error
            );


            res
                .status(
                    error.status || 500
                )
                .json({

                    success: false,

                    error:
                        "Unable to retrieve Shopify themes",

                    details:
                        error.message

                });

        }

    }
);


// ==========================================
// DEBUG ROUTE
// ==========================================

router.get(
    "/debug",
    async (req, res) => {

        try {

            const {
                data,
                error
            } = await supabase

                .from("shops")

                .select(
                    "shop, installed_at, updated_at, expires_at, refresh_token_expires_at"
                );


            if (error) {

                return res
                    .status(500)
                    .json({

                        success: false,

                        error:
                            "Supabase lookup failed",

                        details:
                            error.message

                    });

            }


            res.json({

                success: true,

                shops:
                    data || []

            });


        } catch (error) {

            console.error(
                "❌ /api/debug ERROR:",
                error
            );


            res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Debug request failed",

                    details:
                        error.message

                });

        }

    }
);


// ==========================================
// API TEST ROUTE
// ==========================================

router.get(
    "/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Auditly Pro API is working",

            architecture:
                "Supabase → Shopify API",

            shopifyApiVersion:
                SHOPIFY_API_VERSION

        });

    }
);


// ==========================================
// EXPORT
// ==========================================

module.exports = router;
