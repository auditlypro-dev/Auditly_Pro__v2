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
                "CONTACT_INFORMATION",

            name:
                "Contact Information"

        },

        {
            type:
                "LEGAL_NOTICE",

            name:
                "Legal Notice"

        },

        {
            type:
                "TERMS_OF_SALE",

            name:
                "Terms of Sale"

        },

        {
            type:
                "SUBSCRIPTION_POLICY",

            name:
                "Subscription/Cancellation Policy"

        }

    ];


    for (
        const optionalPolicy
        of additionalPolicyTypes
    ) {

        const policy =
            policies.find(
                item =>
                    item.type ===
                    optionalPolicy.type
            );


        if (!policy) {

            // These are NOT automatically treated
            // as failures because requirements vary.
            continue;

        }


        const bodyText =
            normalizeText(
                policy.body
            );


        if (
            bodyText.length === 0
        ) {

    findings.push({

                category:
                    "Compliance",

                severity:
                    "warning",

                policyType:
                    optionalPolicy.type,

                message:
                    `${optionalPolicy.name} is configured but appears to contain no readable content.`

            });

        }

    }


    // ======================================
    // Final policy score
    // ======================================

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

        available:
            true,

        policiesFound,

        policiesMissing,

        policiesWithWeakContent,

        findings

    };

}


// ==========================================
// Build Recommendations
// ==========================================

function buildRecommendations(
    productAudit,
    policyAudit
) {

    const recommendations = [];


    // ======================================
    // Compliance Recommendations
    // ======================================

    if (
        policyAudit.available
    ) {

        if (
            policyAudit.policiesMissing > 0
        ) {

            recommendations.push({

                priority:
                    "High",

                category:
                    "Compliance",

                recommendation:
                    "Review missing store policies and publish the policies applicable to your business, products, and jurisdiction."

            });

        }


        if (
            policyAudit.policiesWithWeakContent > 0
        ) {

            recommendations.push({

                priority:
                    "High",

                category:
                    "Compliance",

                recommendation:
                    "Review policies with empty or unusually short content and make sure they accurately explain the merchant's applicable terms and practices."

            });

        }

    } else {

        recommendations.push({

            priority:
                "Medium",

            category:
                "Compliance",

            recommendation:
                "Reauthorize Auditly Pro with legal-policy access so the compliance scanner can inspect the store's configured policies."

        });

    }


    // ======================================
    // Product Title
    // ======================================

    if (
        productAudit.productsWithoutTitles > 0
    ) {

        recommendations.push({

            priority:
                "High",

            category:
                "SEO",

            recommendation:
                "Add clear, descriptive titles to products that are missing titles."

        });

    }


    // ======================================
    // Product descriptions
    // ======================================

    if (
        productAudit.productsWithoutDescriptions > 0
    ) {

        recommendations.push({

            priority:
                "High",

            category:
                "Content",

            recommendation:
                "Add detailed product descriptions that accurately explain the product's features, benefits, specifications, and intended use."

        });

    }


    if (
        productAudit.productsWithShortDescriptions > 0
    ) {

        recommendations.push({

            priority:
                "Medium",

            category:
                "Content",

            recommendation:
                "Expand unusually short product descriptions with useful, accurate information that helps shoppers understand the product."

        });

    }


    // ======================================
    // Images
    // ======================================

    if (
        productAudit.productsWithoutImages > 0
    ) {

        recommendations.push({

            priority:
                "High",

            category:
                "Store Optimization",

            recommendation:
                "Add high-quality product images to products that currently have no images."

        });

    }


    // ======================================
    // Alt text
    // ======================================

    if (
        productAudit.productsWithoutAltText > 0
    ) {

        recommendations.push({

            priority:
                "Medium",

            category:
                "Accessibility",

            recommendation:
                "Add accurate, descriptive alt text to product images to improve accessibility and image SEO."

        });

    }


    // ======================================
    // SEO metadata
    // ======================================

    if (
        productAudit.productsWithoutSEOTitle > 0
    ) {

        recommendations.push({

            priority:
                "High",

            category:
                "SEO",

            recommendation:
                "Add unique, descriptive SEO titles to products that are missing them."

        });

    }


    if (
        productAudit.productsWithoutSEODescription > 0
    ) {

        recommendations.push({

            priority:
                "High",

            category:
                "SEO",

            recommendation:
                "Add useful meta descriptions to products that are missing them."

        });

    }


    if (
        productAudit.productsWithShortSEODescription > 0
    ) {

        recommendations.push({

            priority:
                "Medium",

            category:
                "SEO",

            recommendation:
                "Review very short product meta descriptions and expand them with accurate, compelling search-result copy."

        });

    }


    // ======================================
    // No recommendations
    // ======================================

    if (
        recommendations.length === 0
    ) {

        recommendations.push({

            priority:
                "Low",

            category:
                "Optimization",

            recommendation:
                "No major issues were detected in the areas currently audited. Continue monitoring your store for new compliance, SEO, accessibility, and optimization opportunities."

        });

    }


    return recommendations;

}


// ==========================================
// Calculate Overall Score
// ==========================================

function calculateOverallScore(
    productAudit,
    policyAudit
) {

    const scores = [];


    if (
        typeof productAudit.score === "number"
    ) {

        scores.push(
            productAudit.score
        );

    }


    if (
        policyAudit.available &&
        typeof policyAudit.score === "number"
    ) {

        scores.push(
            policyAudit.score
        );

    }


    if (
        scores.length === 0
    ) {

        return 0;

    }


    const total =
        scores.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    return Math.round(
        total / scores.length
    );

}


// ==========================================
// Overall Audit
// ==========================================

async function runAudit(
    shop,
    accessToken
) {

    console.log(
        "🚀 STARTING STORE AUDIT:",
        shop
    );


    // ======================================
    // Retrieve Shopify products
    // ======================================

const products =
        await getProducts(
            shop,
            accessToken
        );


    console.log(
        `📦 Retrieved ${products.length} products`
    );


    // ======================================
    // Retrieve store policies
    // ======================================

    const policyResult =
        await getShopPolicies(
            shop,
            accessToken
        );


    if (
        policyResult.available
    ) {

        console.log(
            `📜 Retrieved ${policyResult.policies.length} store policies`
        );

    } else {

        console.warn(
            "⚠️ Store policy audit unavailable."
        );

    }


    // ======================================
    // Audit products
    // ======================================

    const productAudit =
        auditProducts(
            products
        );


    // ======================================
    // Audit policies
    // ======================================

    const policyAudit =
        auditPolicies(
            policyResult
        );


    // ======================================
    // Recommendations
    // ======================================

    const recommendations =
        buildRecommendations(
            productAudit,
            policyAudit
        );


    // ======================================
    // Overall score
    // ======================================

    const score =
        calculateOverallScore(
            productAudit,
            policyAudit
        );


    let rating;


    if (
        score >= 90
    ) {

        rating =
            "Excellent";

    } else if (
        score >= 80
    ) {

        rating =
            "Good";

    } else if (
        score >= 70
    ) {

        rating =
            "Needs Improvement";

    } else if (
        score >= 50
    ) {

        rating =
            "Poor";

    } else {

        rating =
            "Critical";

    }


    console.log(
        `✅ STORE AUDIT COMPLETE: ${score}/100`
    );


    // ======================================
    // Combine findings
    // ======================================

    const findings = [

        ...productAudit.findings,

        ...policyAudit.findings

    ];


    // ======================================
    // Return Audit
    // ======================================

    return {

        success:
            true,

        shop,

        auditDate:
            new Date().toISOString(),

        score,

        rating,


        // ====================================
        // Summary
        // ====================================

        summary: {

            totalProducts:
                productAudit.totalProducts,

            productsWithIssues:
                productAudit.productsWithIssues,

            policiesFound:
                policyAudit.policiesFound,

            policiesMissing:
                policyAudit.policiesMissing,

            complianceAuditAvailable:
                policyAudit.available

        },


        // ====================================
        // Category Scores
        // ====================================

        categories: {

            products: {

                score:
                    productAudit.score,

                totalProducts:
                    productAudit.totalProducts,

                productsWithIssues:
                    productAudit.productsWithIssues

            },


            seo: {

                score:
                    productAudit.score,

                productsWithoutSEOTitle:
                    productAudit.productsWithoutSEOTitle,

                productsWithoutSEODescription:
                    productAudit.productsWithoutSEODescription,

                productsWithShortSEODescription:
                    productAudit.productsWithShortSEODescription

            },


            compliance: {

                score:
                    policyAudit.score,

                available:
                    policyAudit.available,

                policiesFound:
                    policyAudit.policiesFound,

                policiesMissing:
                    policyAudit.policiesMissing,

                policiesWithWeakContent:
                    policyAudit.policiesWithWeakContent

            }

        },


        // ====================================
        // Findings
        // ====================================

        findings,


        // ====================================
        // Recommendations
        // =====================
        
        recommendations

    };

}


// ==========================================
// Export
// ==========================================

module.exports = {

    runAudit,

    getProducts,

    getShopPolicies,

    auditProducts,

    auditPolicies

};
🛑 Stop after replacing
