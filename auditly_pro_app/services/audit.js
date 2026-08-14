// ==========================================
// Auditly Pro v3
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

                        images(first: 20) {

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

                        variants(first: 20) {

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
// Add Finding
// ==========================================

function addFinding(
    findings,
    product,
    category,
    severity,
    message,
    recommendation = null
) {

    findings.push({

        category,

        severity,

        productId:
            product?.id || null,

        productTitle:
            product?.title || null,

        message,

        recommendation

    });

}


// ==========================================
// Audit Products
// ==========================================

function auditProducts(products) {

    const findings = [];

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {

        return {

            score: null,

            rating: "Audit Incomplete",

            totalProducts: 0,

            productsWithIssues: 0,

            checksPerformed: 0,

            checksPassed: 0,

            criticalIssues: 0,

            highIssues: 0,

            mediumIssues: 0,

            lowIssues: 0,

            productsWithoutTitles: 0,

            productsWithoutDescriptions: 0,

            productsWithShortDescriptions: 0,

            productsWithoutImages: 0,

            productsWithoutAltText: 0,

            productsWithoutSEO: 0,

            productsWithShortSEOTitles: 0,

            productsWithLongSEOTitles: 0,

            productsWithShortMetaDescriptions: 0,

            productsWithLongMetaDescriptions: 0,

            productsWithoutProductType: 0,

            productsWithoutVendor: 0,

            productsWithoutHandle: 0,

            productsWithoutPrice: 0,

            productsOutOfStock: 0,

            productsWithInvalidInventory: 0,

            findings: [

                {

                    category: "Products",

                    severity: "warning",

                    productId: null,

                    productTitle: null,

                    message:
                        "No products were found in the Shopify store. A meaningful product audit could not be completed.",

                    recommendation:
                        "Add products to the store or verify that the Shopify connection has permission to read products."

                }

            ]

        };

    }


    // ==========================================
    // Counters
    // ==========================================

    let productsWithIssues = 0;

    let productsWithoutTitles = 0;

    let productsWithoutDescriptions = 0;

    let productsWithShortDescriptions = 0;

    let productsWithoutImages = 0;

    let productsWithoutAltText = 0;

    let productsWithoutSEO = 0;

    let productsWithShortSEOTitles = 0;

    let productsWithLongSEOTitles = 0;

    let productsWithShortMetaDescriptions = 0;

    let productsWithLongMetaDescriptions = 0;

    let productsWithoutProductType = 0;

    let productsWithoutVendor = 0;

    let productsWithoutHandle = 0;

    let productsWithoutPrice = 0;

    let productsOutOfStock = 0;

    let productsWithInvalidInventory = 0;


    // ==========================================
    // Audit Every Product
    // ==========================================

    for (const product of products) {

        let productHasIssues = false;


        // --------------------------------------
        // Title
        // --------------------------------------

        if (
            !product.title ||
            product.title.trim().length === 0
        ) {

            productsWithoutTitles++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "SEO",
                "high",
                "Product is missing a title.",
                "Add a clear, descriptive product title that accurately identifies the product."
            );

        }


        // --------------------------------------
        // Description
        // --------------------------------------

        const description =
            product.description
                ? product.description.trim()
                : "";


        if (!description) {

            productsWithoutDescriptions++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "Content",
                "high",
                "Product is missing a description.",
                "Add a detailed description explaining the product's features, benefits, and intended use."
            );

        } else if (
            description.length < 50
        ) {

            productsWithShortDescriptions++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "Content",
                "medium",
                "Product description is very short.",
                "Expand the description with useful product details, benefits, specifications, and use cases."
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

            productsWithoutImages++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "Store Optimization",
                "high",
                "Product has no images.",
                "Add high-quality product images so customers can better understand the product."
            );

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

                productsWithoutAltText++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "Accessibility",
                    "medium",
                    `${missingAltText.length} product image(s) are missing alt text.`,
                    "Add descriptive alt text to product images for accessibility and image SEO."
                );

            }

        }


        // --------------------------------------
        // SEO Metadata
        // --------------------------------------

        const seo =
            product.seo || {};


        const seoTitle =
            seo.title
                ? seo.title.trim()
                : "";


        const seoDescription =
            seo.description
                ? seo.description.trim()
                : "";


        if (
            !seoTitle &&
            !seoDescription
        ) {

            productsWithoutSEO++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "SEO",
                "high",
                "Product SEO metadata is missing.",
                "Add an SEO title and meta description that clearly describe the product."
            );

        } else {

            // ----------------------------------
            // SEO Title Length
            // ----------------------------------

            if (
                seoTitle &&
                seoTitle.length < 30
            ) {

                productsWithShortSEOTitles++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "SEO",
                    "notice",
                    "SEO title is unusually short.",
                    "Consider expanding the SEO title with useful product-specific keywords while keeping it natural."
                );

            }


            if (
                seoTitle &&
                seoTitle.length > 70
            ) {

                productsWithLongSEOTitles++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "SEO",
                    "notice",
                    "SEO title is unusually long.",
                    "Shorten the SEO title so the most important information appears first."
                );

            }


            // ----------------------------------
            // Meta Description Length
            // ----------------------------------

            if (
                seoDescription &&
                seoDescription.length < 70
            ) {

                productsWithShortMetaDescriptions++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "SEO",
                    "notice",
                    "Meta description is unusually short.",
                    "Expand the meta description with useful information about the product."
                );

            }


            if (
                seoDescription &&
                seoDescription.length > 160
            ) {

                productsWithLongMetaDescriptions++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "SEO",
                    "notice",
                    "Meta description is unusually long.",
                    "Shorten the meta description so the most important information appears first."
                );

            }

        }


        // --------------------------------------
        // Handle / URL
        // --------------------------------------

        if (
            !product.handle ||
            product.handle.trim().length === 0
        ) {

            productsWithoutHandle++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "SEO",
                "medium",
                "Product URL handle is missing.",
                "Create a clean, descriptive URL handle for the product."
            );

        }


        // --------------------------------------
        // Product Type
        // --------------------------------------

        if (
            !product.productType ||
            product.productType.trim().length === 0
        ) {

            productsWithoutProductType++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "Product Organization",
                "medium",
                "Product type is missing.",
                "Assign an appropriate product type to improve store organization and product management."
            );

        }


        // --------------------------------------
        // Vendor
        // --------------------------------------

        if (
            !product.vendor ||
            product.vendor.trim().length === 0
        ) {

            productsWithoutVendor++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "Product Organization",
                "notice",
                "Product vendor is missing.",
                "Add a vendor or brand name when appropriate."
            );

        }


        // --------------------------------------
        // Variants / Pricing
        // --------------------------------------

        const variants =
            product.variants?.edges || [];


        if (
            variants.length === 0
        ) {

            productsWithoutPrice++;

            productHasIssues = true;

            addFinding(
                findings,
                product,
                "Pricing",
                "high",
                "Product has no variants or pricing information.",
                "Verify that the product has an active variant with a valid price."
            );

        } else {

            let productHasValidPrice = false;

            for (
                const variantEdge of variants
            ) {

                const variant =
                    variantEdge.node;

                const price =
                    Number(variant.price);

                if (
                    Number.isFinite(price) &&
                    price > 0
                ) {

                    productHasValidPrice = true;

                }

            }


            if (
                !productHasValidPrice
            ) {

                productsWithoutPrice++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "Pricing",
                    "high",
                    "Product does not appear to have a valid positive price.",
                    "Verify that at least one active product variant has a valid price."
                );

            }

        }


        // --------------------------------------
        // Inventory
        // --------------------------------------

        if (
            typeof product.totalInventory === "number"
        ) {

            if (
                product.totalInventory < 0
            ) {

                productsWithInvalidInventory++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "Inventory",
                    "high",
                    "Product inventory appears to be invalid.",
                    "Review the product's inventory levels and inventory tracking settings."
                );

            }


            if (
                product.totalInventory === 0
            ) {

                productsOutOfStock++;

                productHasIssues = true;

                addFinding(
                    findings,
                    product,
                    "Inventory",
                    "notice",
                    "Product currently has zero inventory.",
                    "Review inventory availability and determine whether the product should remain available for sale."
                );

            }

        }


        // --------------------------------------
        // Track product issue status
        // --------------------------------------

        if (
            productHasIssues
        ) {

            productsWithIssues++;

        }

    }


    // ==========================================
    // Determine Severity Counts
    // ==========================================

    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;


    for (
        const finding of findings
    ) {

        switch (
            finding.severity
        ) {

            case "critical":
                criticalIssues++;
                break;

            case "high":
                highIssues++;
                break;

            case "medium":
                mediumIssues++;
                break;

            default:
                lowIssues++;

        }

    }


    // ==========================================
    // Scoring
    // ==========================================

    const checksPerProduct = 12;

    const totalChecks =
        products.length *
        checksPerProduct;

    const issuePenalty =
        (
            criticalIssues * 8
        ) +
        (
            highIssues * 4
        ) +
        (
            mediumIssues * 2
        ) +
        (
            lowIssues * 1
        );


    let points =
        100 -
        (
            issuePenalty /
            Math.max(
                1,
                products.length
            )
        );


    points =
        Math.round(
            points
        );


    points =
        Math.max(
            0,
            Math.min(
                100,
                points
            )
        );


    const checksPassed =
        Math.max(
            0,
            totalChecks - findings.length
        );


    return {

        score: points,

        rating:
            getRating(points),

        totalProducts:
            products.length,

        productsWithIssues,

        checksPerformed:
            totalChecks,

        checksPassed,

        criticalIssues,

        highIssues,

        mediumIssues,

        lowIssues,

        productsWithoutTitles,

        productsWithoutDescriptions,

        productsWithShortDescriptions,

        productsWithoutImages,

        productsWithoutAltText,

        productsWithoutSEO,

        productsWithShortSEOTitles,

        productsW
