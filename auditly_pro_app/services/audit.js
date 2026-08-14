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
// Audit Products
// ==========================================

function auditProducts(products) {

    const findings = [];

    let points = 100;

    let productsWithIssues = 0;

    let productsWithoutImages = 0;

    let productsWithoutAltText = 0;

    let productsWithoutSEO = 0;

    let productsWithoutDescriptions = 0;

    let productsWithoutTitles = 0;


    // ==========================================
    // IMPORTANT:
    // No products does NOT equal a perfect score.
    // ==========================================

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {

        return {

            score: null,

            rating: "Audit Incomplete",

            totalProducts: 0,

            productsWithIssues: 0,

            productsWithoutTitles: 0,

            productsWithoutDescriptions: 0,

            productsWithoutImages: 0,

            productsWithoutAltText: 0,

            productsWithoutSEO: 0,

            findings: [

                {

                    category: "Products",

                    severity: "warning",

                    message:
                        "No products were found in the Shopify store. A meaningful product audit could not be completed."

                }

            ]

        };

    }


    // ==========================================
    // Analyze Products
    // ==========================================

    for (const product of products) {

        const issues = [];


        // --------------------------------------
        // Product title
        // --------------------------------------

        if (
            !product.title ||
            product.title.trim().length === 0
        ) {

            issues.push(
                "Product is missing a title."
            );

            productsWithoutTitles++;

        }


        // --------------------------------------
        // Description
        // --------------------------------------

        if (
            !product.description ||
            product.description.trim().length === 0
        ) {

            issues.push(
                "Product is missing a description."
            );

            productsWithoutDescriptions++;

        } else if (
            product.description.trim().length < 50
        ) {

            issues.push(
                "Product description is very short."
            );

        }


        // --------------------------------------
        // Images
        // --------------------------------------

        const images =
            product.images?.edges || [];


        if (
            images.length === 0
        ) {

            issues.push(
                "Product has no images."
            );

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

                issues.push(
                    `${missingAltText.length} product image(s) are missing alt text.`
                );

                productsWithoutAltText++;

            }

        }


        // --------------------------------------
        // SEO
        // --------------------------------------

        const seo =
            product.seo;


        if (
            !seo ||
            (
                !seo.title &&
                !seo.description
            )
        ) {

            issues.push(
                "Product SEO metadata is missing."
            );

            productsWithoutSEO++;

        }


        // --------------------------------------
        // Inventory
        // --------------------------------------

        if (
            typeof product.totalInventory === "number" &&
            product.totalInventory < 0
        ) {

            issues.push(
                "Product inventory appears invalid."
            );

        }


        // --------------------------------------
        // Record findings
        // --------------------------------------

        if (
            issues.length > 0
        ) {

            productsWithIssues++;


            for (
                const issue of issues
            ) {

                findings.push({

                    category: "Products",

                    severity:
                        issue.includes("missing")
                            ? "warning"
                            : "notice",

                    productId:
                        product.id,

                    productTitle:
                        product.title,

                    message:
                        issue

                });

            }

        }

    }


    // ==========================================
    // Score deductions
    // ==========================================

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


    points =
        Math.max(
            0,
            Math.min(
                100,
                points
            )
        );


    return {

        score: points,

        rating: getRating(points),

        totalProducts:
            products.length,

        productsWithIssues,

        productsWithoutTitles,

        productsWithoutDescriptions,

        productsWithoutImages,

        productsWithoutAltText,

        productsWithoutSEO,

        findings

    };

}


// ==========================================
// Rating
// ==========================================

function getRating(score) {

    if (
        score === null ||
        score === undefined
    ) {

        return "Audit Incomplete";

    }


    if (
        score >= 90
    ) {

        return "Excellent";

    }


    if (
        score >= 80
    ) {

        return "Good";

    }


    if (
        score >= 70
    ) {

        return "Needs Improvement";

    }


    if (
        score >= 50
    ) {

        return "Poor";

    }


    return "Critical";

}


// ==========================================
// Build Recommendations
// ==========================================

function buildRecommendations(
    productAudit
) {

    const recommendations = [];


    // ==========================================
    // No Products
    // ==========================================

    if (
        productAudit.totalProducts === 0
    ) {

        recommendations.push({

            priority: "High",

            category: "Store Setup",

            recommendation:
                "Add products to your Shopify store or verify that your store is active and that products are available through the Shopify Admin API."

        });


        return recommendations;

    }


    // ==========================================
    // Missing Titles
    // ==========================================

    if (
        productAudit.productsWithoutTitles > 0
    ) {

        recommendations.push({

            priority: "High",

            category: "SEO",

            recommendation:
                "Add clear, descriptive titles to products that are missing titles."

        });

    }


    // ==========================================
    // Missing Descriptions
    // ==========================================

    if (
        productAudit.productsWithoutDescriptions > 0
    ) {

        recommendations.push({

            priority: "High",

            category: "Content",

            recommendation:
                "Add detailed product descriptions that explain the product's benefits, features, and use cases."

        });

    }


    // ==========================================
    // Missing Images
    // ==========================================

    if (
        productAudit.productsWithoutImages > 0
    ) {

        recommendations.push({

            priority: "High",

            category: "Store Optimization",

            recommendation:
                "Add high-quality product images to products that currently have no images."

        });

    }


    // ==========================================
    // Missing Alt Text
    // ==========================================

    if (
        productAudit.productsWithoutAltText > 0
    ) {

        recommendations.push({

            priority: "Medium",

            category: "Accessibility",

            recommendation:
                "Add descriptive alt text to product images to improve accessibility and image SEO."

        });

    }


    // ==========================================
    // Missing SEO
    // ==========================================

    if (
        productAudit.productsWithoutSEO > 0
    ) {

        recommendations.push({

            priority: "High",

            category: "SEO",

            recommendation:
                "Add SEO titles and meta descriptions to products that are missing SEO metadata."

        });

    }


    // ==========================================
    // No Major Issues
    // ==========================================

    if (
        recommendations.length === 0
    ) {

        recommendations.push({

            priority: "Low",

            category: "Optimization",

            recommendation:
                "No major product issues were detected. Continue monitoring your store for optimization opportunities."

        });

    }


    return recommendations;

}


// ==========================================
// Run Complete Audit
// ==========================================

async function runAudit(
    shop,
    accessToken
) {

    console.log(
        "🚀 STARTING STORE AUDIT:",
        shop
    );


    // ==========================================
    // Retrieve Products
    // ==========================================

    const products =
        await getProducts(
            shop,
            accessToken
        );


    console.log(
        `📦 Retrieved ${products.length} products`
    );


    // ==========================================
    // Audit Products
    // ==========================================

    const productAudit =
        auditProducts(
            products
        );


    // ==========================================
    // Recommendations
    // ==========================================

    const recommendations =
        buildRecommendations(
            productAudit
        );


    // ==========================================
    // Overall Score
    // ==========================================

    const score =
        productAudit.score;


    const rating =
        productAudit.rating;


    // ==========================================
    // Completion Logging
    // ==========================================

    if (
        score === null
    ) {

        console.log(
            "⚠️ STORE AUDIT INCOMPLETE: No products available for analysis."
        );

    } else {

        console.log(
            `✅ STORE AUDIT COMPLETE: ${score}/100`
        );

    }


    // ==========================================
    // Final Result
    // ==========================================

    return {

        success: true,

        shop,

        auditDate:
            new Date().toISOString(),

        score,

        rating,

        auditStatus:
            score === null
                ? "incomplete"
                : "complete",

        summary: {

            totalProducts:
                productAudit.totalProducts,

            productsWithIssues:
                productAudit.productsWithIssues

        },

        categories: {

            products: {

                score:
                    productAudit.score,

                rating:
                    productAudit.rating,

                totalProducts:
                    productAudit.totalProducts,

                productsWithIssues:
                    productAudit.productsWithIssues

            }

        },

        findings:
            productAudit.findings,

        recommendations

    };

}


// ==========================================
// Export
// ==========================================

module.exports = {

    runAudit,

    getProducts,

    auditProducts

};
