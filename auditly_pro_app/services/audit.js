// ==========================================
// Auditly Pro v2
// Shopify Store Audit Engine
// ==========================================

const SHOPIFY_API_VERSION = "2026-07";


// ==========================================
// Shopify GraphQL Request
// ==========================================

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
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken
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
            `Shopify API returned HTTP ${response.status}`
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


// ==========================================
// Get Products
// ==========================================

async function getProducts(
    shop,
    accessToken
) {

    const query = `
        query GetProducts($first: Int!) {

            products(first: $first) {

                edges {

                    node {

                        id
                        title
                        handle
                        description
                        descriptionHtml
                        vendor
                        productType
                        status

                        onlineStoreUrl

                        totalInventory

                        featuredImage {
                            url
                            altText
                        }

                        images(first: 10) {

                            edges {

                                node {

                                    url
                                    altText

                                }

                            }

                        }

                        seo {

                            title
                            description

                        }

                        variants(first: 10) {

                            edges {

                                node {

                                    id
                                    title
                                    price
                                    inventoryQuantity

                                }

                            }

                        }

                    }

                }

            }

        }
    `;

    const data = await shopifyGraphQL(
        shop,
        accessToken,
        query,
        {
            first: 100
        }
    );

    return data.data.products.edges.map(
        edge => edge.node
    );

}


// ==========================================
// Get Store Policies
// ==========================================
//
// Shopify requires read_legal_policies for
// this query.
//
// If the connected token does not yet have
// this permission, the function returns a
// graceful "unavailable" result instead of
// breaking the entire store audit.
// ==========================================

async function getShopPolicies(
    shop,
    accessToken
) {

    const query = `
        query GetShopPolicies {

            shop {

                shopPolicies {

                    id
                    type
                    title
                    body
                    url
                    createdAt
                    updatedAt

                }

            }

        }
    `;

    try {

        const data =
            await shopifyGraphQL(
                shop,
                accessToken,
                query
            );

        return {

            available: true,

            policies:
                data.data?.shop?.shopPolicies || []

        };

    } catch (error) {

        console.warn(
            "⚠️ Store policies could not be retrieved:",
            error.message
        );

        return {

            available: false,

            policies: [],

            error:
                error.message

        };

    }

}


// ==========================================
// Normalize Text
// ==========================================

function normalizeText(value) {

    if (!value) {

        return "";

    }

    return String(value)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


// ==========================================
// Audit Products
// ==========================================

function auditProducts(products) {

    const findings = [];

    let points = 100;

    let productsWithIssues = 0;

    let productsWithoutImages = 0;

    let productsWithoutAltText = 0;

    let productsWithoutSEO = 0;

    let productsWithoutSEOTitle = 0;

    let productsWithoutSEODescription = 0;

    let productsWithShortSEODescription = 0;

    let productsWithoutDescriptions = 0;

    let productsWithShortDescriptions = 0;

    let productsWithoutTitles = 0;


    for (const product of products) {

        const issues = [];


        // ======================================
        // Product title
        // ======================================

        if (
            !product.title ||
            product.title.trim().length === 0
        ) {

            issues.push({

                message:
                    "Product is missing a title.",

                severity:
                    "high",

                category:
                    "Products"

            });

            productsWithoutTitles++;

        }


        // ======================================
        // Product description
        // ======================================

        if (
            !product.description ||
            product.description.trim().length === 0
        ) {

            issues.push({

                message:
                    "Product is missing a description.",

                severity:
                    "high",

                category:
                    "Content"

            });

            productsWithoutDescriptions++;

        } else if (
            product.description.trim().length < 50
        ) {

            issues.push({

                message:
                    "Product description is very short.",

                severity:
                    "notice",

                category:
                    "Content"

            });

            productsWithShortDescriptions++;

        }


        // ======================================
        // Product images
        // ======================================

        const images =
            product.images?.edges || [];


        if (images.length === 0) {

            issues.push({

                message:
                    "Product has no images.",

                severity:
                    "high",

                category:
                    "Store Optimization"

            });

            productsWithoutImages++;

        } else {

            const missingAltText =
                images.filter(
                    image =>
                        !image.node.altText ||
                        image.node.altText.trim() === ""
                );


            if (
                missingAltText.length > 0
            ) {

                issues.push({

                    message:
                        `${missingAltText.length} product image(s) are missing alt text.`,

                    severity:
                        "warning",

                    category:
                        "Accessibility"

                });

                productsWithoutAltText++;

            }

        }


        // ======================================
        // Product SEO
        // ======================================

        const seo =
            product.seo;


        if (!seo) {

            issues.push({

                message:
                    "Product SEO metadata is unavailable.",

                severity:
                    "warning",

                category:
                    "SEO"

            });

            productsWithoutSEO++;

        } else {

            const seoTitle =
                seo.title
                    ? seo.title.trim()
                    : "";

            const seoDescription =
                seo.description
                    ? seo.description.trim()
                    : "";


            // ----------------------------------
            // SEO title
            // ----------------------------------

            if (!seoTitle) {

                issues.push({

                    message:
                        "Product SEO title is missing.",

                    severity:
                        "warning",

                    category:
                        "SEO"

                });

                productsWithoutSEOTitle++;

            } else if (
                seoTitle.length > 70
            ) {

                issues.push({

                    message:
                        "Product SEO title may be too long for search-result display.",

                    severity:
                        "notice",

                    category:
                        "SEO"

                });

            }


            // ----------------------------------
            // Meta description
            // ----------------------------------

            if (!seoDescription) {

                issues.push({

                    message:
                        "Product meta description is missing.",

                    severity:
                        "warning",

                    category:
                        "SEO"

                });

                productsWithoutSEODescription++;

            } else if (
                seoDescription.length < 50
            ) {

                issues.push({

                    message:
                        "Product meta description is very short.",

                    severity:
                        "notice",

                    category:
                        "SEO"

                });

                productsWithShortSEODescription++;

            } else if (
                seoDescription.length > 170
            ) {

                issues.push({

                    message:
                        "Product meta description may be too long for search-result display.",

                    severity:
                        "notice",

                    category:
                        "SEO"

                });

            }

        }


        // ======================================
        // Inventory
        // ======================================

        if (
            typeof product.totalInventory === "number" &&
            product.totalInventory < 0
        ) {

            issues.push({

                message:
                    "Product inventory appears invalid.",

                severity:
                    "warning",

                category:
                    "Products"

            });

        }


        // ======================================
        // Record product findings
        // ======================================

        if (issues.length > 0) {

            productsWithIssues++;

            for (const issue of issues) {

                findings.push({

                    category:
                        issue.category || "Products",

                    severity:
                        issue.severity,

                    productId:
                        product.id,

                    productTitle:
                        product.title,

                    message:
                        issue.message

                });

            }

        }

    }


    // ======================================
    // Score deductions
    // ======================================

    points -=
        productsWithoutTitles * 5;

    points -=
        productsWithoutDescriptions * 3;

    points -=
        productsWithoutImages * 4;

    points -=
        productsWithoutAltText * 2;

    points -=
        productsWithoutSEO * 3;

    points -=
        productsWithoutSEOTitle * 1;

    points -=
        productsWithoutSEODescription * 1;

    points -=
        productsWithShortSEODescription * 0.5;

    points -=
        productsWithShortDescriptions * 0.5;


    points =
        Math.round(
            Math.max(
                0,
                Math.min(100, points)
            )
        );


    return {

        score:
            points,

        totalProducts:
            products.length,

        productsWithIssues,

        productsWithoutTitles,

        productsWithoutDescriptions,

        productsWithShortDescriptions,

        productsWithoutImages,

        productsWithoutAltText,

        productsWithoutSEO,

        productsWithoutSEOTitle,

        productsWithoutSEODescription,

        productsWithShortSEODescription,

        findings

    };

}


// ==========================================
// Audit Store Policies
// ==========================================
//
// These checks identify configured/missing
// policies and basic content-quality signals.
//
// They do NOT claim that a store is legally
// compliant. Legal requirements vary by
// jurisdiction, business model, products,
// and other circumstances.
// ==========================================

function auditPolicies(
    policyResult
) {

    const findings = [];

    let points = 100;

    let policiesFound = 0;

    let policiesMissing = 0;

    let policiesWithWeakContent = 0;


    // ======================================
    // Permission unavailable
    // ======================================

    if (
        !policyResult.available
    ) {

        findings.push({

            category:
                "Compliance",

            severity:
                "notice",

            message:
                "Auditly Pro could not inspect the store's legal policies with the currently authorized Shopify access token. Reauthorization may be required to complete the compliance scan."

        });


        return {

            score:
                null,

            available:
                false,

            policiesFound:
                0,

            policiesMissing:
                0,

            policiesWithWeakContent:
                0,

            findings

        };

    }


    const policies =
        policyResult.policies || [];


    // ======================================
    // Required policy types for this audit
    // ======================================

    const requiredPolicies = [

        {
            type:
                "PRIVACY_POLICY",

            name:
                "Privacy Policy"

        },

        {
            type:
                "REFUND_POLICY",

            name:
                "Refund Policy"

        },

        {
            type:
                "SHIPPING_POLICY",

            name:
                "Shipping Policy"

        },

        {
            type:
                "TERMS_OF_SERVICE",

            name:
                "Terms of Service"

        }

    ];


    // ======================================
    // Check each policy
    // ======================================

    for (
        const requiredPolicy
        of requiredPolicies
    ) {

        const policy =
            policies.find(
                item =>
                    item.type ===
                    requiredPolicy.type
            );


        // ----------------------------------
        // Missing policy
        // ----------------------------------

        if (!policy) {

            policiesMissing++;

            points -= 12;

            findings.push({

                category:
                    "Compliance",

                severity:
                    "high",

                policyType:
                    requiredPolicy.type,

                message:
                    `${requiredPolicy.name} was not found in the store policies returned by Shopify. Review whether this policy is required for your business and jurisdiction.`

            });

            continue;

        }


        policiesFound++;


        // ----------------------------------
        // Empty policy body
        // ----------------------------------

        const bodyText =
            normalizeText(
                policy.body
            );


        if (
            bodyText.length === 0
        ) {

            policiesWithWeakContent++;

            points -= 8;

            findings.push({

                category:
                    "Compliance",

                severity:
                    "high",

                policyType:
                    requiredPolicy.type,

                message:
                    `${requiredPolicy.name} exists but appears to have no readable policy content.`

            });

            continue;

        }


        // ----------------------------------
        // Very short policy
        // ----------------------------------

        if (
            bodyText.length < 100
        ) {

            policiesWithWeakContent++;

            points -= 4;

            findings.push({

                category:
                    "Compliance",

                severity:
                    "warning",

                policyType:
                    requiredPolicy.type,

                message:
                    `${requiredPolicy.name} contains very little text. Review it to make sure it adequately explains the store's applicable terms and practices.`

            });

        }


        // ----------------------------------
        // Policy URL
        // ----------------------------------

        if (
            !policy.url
        ) {

            points -= 2;

            findings.push({

                category:
                    "Compliance",

                severity:
                    "warning",

                policyType:
                    requiredPolicy.type,

                message:
                    `${requiredPolicy.name} does not have a public policy URL returned by Shopify.`

            });

        }

    }


    // ======================================
    // Additional policy types
    // ======================================

    const additionalPolicyTypes = [

        {
            type:
            
