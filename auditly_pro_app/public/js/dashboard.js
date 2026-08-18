// ============================================================
// AUDITLY PRO v2 - DASHBOARD.JS
// Shopify Connection + Store Audit + Billing
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");

    // ==========================================================
    // ELEMENTS
    // ==========================================================

    const auditButton =
        document.getElementById("auditButton");

    const trialButton =
        document.getElementById("startTrialButton") ||
        document.getElementById("start-trial-button") ||
        document.getElementById("trialButton") ||
        document.getElementById("upgradeButton") ||
        Array.from(document.querySelectorAll("button")).find(button =>
            button.textContent
                .toLowerCase()
                .includes("start 7-day free trial")
        ) ||
        Array.from(document.querySelectorAll("button")).find(button =>
            button.textContent
                .toLowerCase()
                .includes("start 7 day free trial")
        );

    const billingStatus =
        document.getElementById("billingStatus");

    const shopStatus =
        document.getElementById("shopStatus");

    console.log("Audit button:", auditButton);
    console.log("Trial button:", trialButton);

    // ==========================================================
    // GET SHOP DOMAIN
    // ==========================================================

    async function getShopDomain() {

        // ------------------------------------------------------
        // 1. Check URL
        // ------------------------------------------------------

        const params =
            new URLSearchParams(window.location.search);

        const urlShop =
            params.get("shop");

        if (
            urlShop &&
            urlShop.includes(".myshopify.com")
        ) {
            console.log(
                "🏪 Shopify shop found in URL:",
                urlShop
            );

            return urlShop;
        }

        // ------------------------------------------------------
        // 2. Ask dashboard backend
        // ------------------------------------------------------

        try {

            const response =
                await fetch(
                    "/dashboard/shop",
                    {
                        method: "GET",
                        headers: {
                            "Accept":
                                "application/json"
                        },
                        credentials: "include"
                    }
                );

            if (response.ok) {

                const data =
                    await response.json();

                if (
                    data.shop &&
                    data.shop.includes(".myshopify.com")
                ) {

                    console.log(
                        "🏪 Shopify shop found from dashboard:",
                        data.shop
                    );

                    return data.shop;
                }
            }

        } catch (error) {

            console.warn(
                "⚠️ Dashboard shop lookup failed:",
                error.message
            );

        }

        // ------------------------------------------------------
        // 3. Check dashboard HTML
        // ------------------------------------------------------

        const selectors = [
            "[data-shop-domain]",
            "#shopDomain",
            "#shop-domain",
            ".shop-domain"
        ];

        for (const selector of selectors) {

            const element =
                document.querySelector(selector);

            if (!element) {
                continue;
            }

            const value =
                element.dataset.shopDomain ||
                element.textContent.trim();

            if (
                value &&
                value.includes(".myshopify.com")
            ) {

                console.log(
                    "🏪 Shopify shop found in dashboard:",
                    value
                );

                return value;
            }
        }

        // ------------------------------------------------------
        // 4. Search visible page text
        // ------------------------------------------------------

        const pageText =
            document.body.innerText || "";

        const match =
            pageText.match(
                /[a-zA-Z0-9-]+\.myshopify\.com/
            );

        if (match) {

            console.log(
                "🏪 Shopify shop found in page text:",
                match[0]
            );

            return match[0];
        }

        // ------------------------------------------------------
        // 5. Nothing found
        // ------------------------------------------------------

        console.error(
            "❌ Unable to determine Shopify shop."
        );

        return null;
    }

    // ==========================================================
    // LOAD SHOP INFORMATION
    // ==========================================================

    async function loadShop() {

        const shop =
            await getShopDomain();

        if (
            shopStatus &&
            shop
        ) {

            shopStatus.innerHTML =
                "🟢 Shopify Store Connected<br><strong>" +
                shop +
                "</strong>";

        }

        return shop;
    }

    // ==========================================================
    // START 7-DAY FREE TRIAL
    // ==========================================================

    async function startFreeTrial() {

        if (!trialButton) {

            console.error(
                "❌ Trial button was not found."
            );

            return;
        }

        const originalText =
            trialButton.textContent;

        trialButton.disabled = true;

        trialButton.textContent =
            "⏳ Starting Free Trial...";

        try {

            const shop =
                await getShopDomain();

            console.log(
                "🏪 Billing shop:",
                shop
            );

            if (!shop) {

                throw new Error(
                    "Auditly Pro could not determine your connected Shopify store. Please connect your Shopify store first."
                );

            }

            console.log(
                "💳 Creating Shopify subscription..."
            );

            const response =
                await fetch(
                    "/billing/upgrade?shop=" +
                    encodeURIComponent(shop),
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "include",

                        body:
                            JSON.stringify({
                                shop: shop
                            })
                    }
                );

            console.log(
                "💳 Billing response status:",
                response.status
            );

            let data = {};

            try {

                data =
                    await response.json();

            } catch (jsonError) {

                console.warn(
                    "Billing response was not JSON."
                );

            }

            console.log(
                "💳 Billing response:",
                data
            );

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    data.details ||
                    `Billing request failed (${response.status})`
                );
            }

            // --------------------------------------------------
            // SHOPIFY CONFIRMATION URL
            // --------------------------------------------------

            const confirmationUrl =
                data.confirmationUrl ||
                data.confirmation_url ||
                data.confirmationURL ||
                data.url;

            if (confirmationUrl) {

                console.log(
                    "✅ Shopify confirmation URL received."
                );

                window.location.href =
                    confirmationUrl;

                return;
            }

            // --------------------------------------------------
            // ALREADY SUBSCRIBED
            // --------------------------------------------------

            if (
                data.active === true ||
                data.subscribed === true ||
                data.subscriptionStatus ===
                    "ACTIVE"
            ) {

                alert(
                    "Your Auditly Pro subscription is already active."
                );

                window.location.reload();

                return;
            }

            throw new Error(
                data.error ||
                data.message ||
                "Shopify did not return a subscription confirmation URL."
            );

        } catch (error) {

            console.error(
                "❌ Failed to start Auditly Pro trial:",
                error
            );

            alert(
                "Unable to start your 7-day free trial.\n\n" +
                error.message
            );

            trialButton.disabled =
                false;

            trialButton.textContent =
                originalText;
        }
    }

    // ==========================================================
    // TRIAL BUTTON
    // ==========================================================

    if (trialButton) {

        trialButton.addEventListener(
            "click",
            startFreeTrial
        );

    } else {

        console.warn(
            "⚠️ Start 7-Day Free Trial button not found."
        );

    }

    // ==========================================================
    // STORE AUDIT
    // ==========================================================

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async () => {

                const originalText =
                    auditButton.textContent;

                auditButton.disabled =
                    true;

                auditButton.textContent =
                    "⏳ Running Audit...";

                try {

                    console.log(
                        "🔍 Starting Shopify store audit..."
                    );

                    const shop =
                        await getShopDomain();

                    console.log(
                        "🏪 Audit shop:",
                        shop
                    );

                    if (!shop) {

                        throw new Error(
                            "Auditly Pro could not determine your connected Shopify store. Please connect your Shopify store first."
                        );

                    }

                    const response =
                        await fetch(
                            "/api/audit?shop=" +
                            encodeURIComponent(shop),
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    "Accept":
                                        "application/json"
                                },

                                credentials:
                                    "include",

                                body:
                                    JSON.stringify({
                                        shop: shop
                                    })
                            }
                        );

                    console.log(
                        "🔍 Audit response status:",
                        response.status
                    );

                    const data =
                        await response.json();

                    console.log(
                        "🔍 Audit response:",
                        data
                    );

                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            data.message ||
                            data.details ||
                            "Store audit failed."
                        );
                    }

                    // ------------------------------------------------
                    // DISPLAY AUDIT RESULTS
                    // ------------------------------------------------

                    const results =
                        document.getElementById(
                            "results"
                        );

                    if (results) {

                        results.innerHTML = `
                            <h3>
                                🧾 Audit Complete
                            </h3>

                            <p>
                                <strong>Store:</strong>
                                ${data.shop || shop}
                            </p>

                            <p>
                                <strong>Score:</strong>
                                ${data.score ?? "N/A"}/100
                            </p>

                            <p>
                                <strong>Rating:</strong>
                                ${data.rating || "N/A"}
                            </p>

                            <p>
                                <strong>Products:</strong>
                                ${data.summary?.totalProducts ?? 0}
                            </p>

                            <p>
                                <strong>Products With Issues:</strong>
                                ${data.summary?.productsWithIssues ?? 0}
                            </p>
                        `;

                    }

                    auditButton.disabled =
                        false;

                    auditButton.textContent =
                        originalText;

                } catch (error) {

                    console.error(
                        "❌ Store audit failed:",
                        error
                    );

                    alert(
                        "Unable to run the store audit.\n\n" +
                        error.message
                    );

                    auditButton.disabled =
                        false;

                    auditButton.textContent =
                        originalText;
                }

            }
        );

    }

    // ==========================================================
    // INITIALIZE
    // ==========================================================

    loadShop()
        .then(shop => {

            if (!shop) {

                console.warn(
                    "⚠️ No connected Shopify store detected."
                );

            } else {

                console.log(
                    "✅ Auditly Pro connected to:",
                    shop
                );

            }

        })
        .catch(error => {

            console.error(
                "❌ Dashboard initialization error:",
                error
            );

        });

    console.log(
        "✅ Auditly Pro dashboard initialized successfully."
    );

});
