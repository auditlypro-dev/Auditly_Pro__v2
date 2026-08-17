// ============================================================
// AUDITLY PRO v2 - DASHBOARD.JS
// Shopify Connection + Store Audit + Billing
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");

    // ==========================================================
    // ELEMENTS
    // ==========================================================

    const statusElement =
        document.getElementById("status");

    const shopStatusElement =
        document.getElementById("shopStatus");

    const billingStatusElement =
        document.getElementById("billingStatus");

    const billingMessageElement =
        document.getElementById("billingMessage");

    const resultsElement =
        document.getElementById("results");

    const connectShop =
        document.getElementById("connectShop");

    const upgradeButton =
        document.getElementById("upgradeButton");

    const auditButton =
        document.getElementById("auditButton");


    console.log("🔘 Upgrade button:", upgradeButton);
    console.log("🔘 Audit button:", auditButton);
    console.log("🔗 Connect button:", connectShop);


    // ==========================================================
    // GET SHOP DOMAIN
    // ==========================================================

    function getShopDomain() {

        // ------------------------------------------------------
        // The dashboard already contains the Shopify shop in:
        //
        // /auth/install?shop=auditly-pro-app.myshopify.com
        // ------------------------------------------------------

        if (connectShop) {

            try {

                const url =
                    new URL(
                        connectShop.href,
                        window.location.origin
                    );

                const shop =
                    url.searchParams.get("shop");

                if (shop) {

                    console.log(
                        "🏪 Shopify shop found:",
                        shop
                    );

                    return shop;

                }

            } catch (error) {

                console.error(
                    "❌ Unable to read Connect Shopify URL:",
                    error
                );

            }

        }


        // ------------------------------------------------------
        // Fallback: search page for a .myshopify.com domain
        // ------------------------------------------------------

        const pageText =
            document.body.innerText || "";

        const match =
            pageText.match(
                /[a-zA-Z0-9-]+\.myshopify\.com/i
            );

        if (match) {

            console.log(
                "🏪 Shopify shop found in page:",
                match[0]
            );

            return match[0].toLowerCase();

        }


        console.error(
            "❌ Could not determine Shopify shop."
        );

        return null;

    }


    // ==========================================================
    // SYSTEM STATUS
    // ==========================================================

    async function loadSystemStatus() {

        if (!statusElement) {
            return;
        }

        try {

            const response =
                await fetch(
                    "/dashboard/status",
                    {
                        method: "GET",
                        headers: {
                            "Accept":
                                "application/json"
                        },
                        cache: "no-store"
                    }
                );

            const data =
                await response.json();

            if (data.success) {

                statusElement.innerHTML =
                    "🟢 <strong>Online</strong>";

            } else {

                statusElement.innerHTML =
                    "🔴 System unavailable";

            }

        } catch (error) {

            console.error(
                "❌ Status error:",
                error
            );

            statusElement.innerHTML =
                "🔴 Unable to check system status";

        }

    }


    // ==========================================================
    // SHOPIFY CONNECTION STATUS
    // ==========================================================

    async function loadShopStatus() {

        if (!shopStatusElement) {
            return;
        }

        const shop =
            getShopDomain();

        if (!shop) {

            shopStatusElement.innerHTML =
                "🔴 Shopify store not detected";

            return;

        }

        try {

            console.log(
                "🔎 Checking Shopify store:",
                shop
            );

            const response =
                await fetch(
                    "/api/store?shop=" +
                    encodeURIComponent(shop),
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        cache: "no-store"
                    }
                );

            const data =
                await response.json();

            console.log(
                "🏪 Store response:",
                data
            );

            if (
                response.ok &&
                data.success &&
                data.shop
            ) {

                const store =
                    data.shop;

                shopStatusElement.innerHTML = `
                    🟢 <strong>Shopify Store Connected</strong>
                    <br>
                    ${store.name || shop}
                    <br>
                    <small>${store.myshopifyDomain || shop}</small>
                `;

            } else {

                shopStatusElement.innerHTML =
                    "🟡 Shopify store needs to be connected.";

            }

        } catch (error) {

            console.error(
                "❌ Shopify connection check failed:",
                error
            );

            shopStatusElement.innerHTML =
                "🟡 Unable to verify Shopify connection.";

        }

    }


    // ==========================================================
    // START 7-DAY FREE TRIAL
    // ==========================================================

    async function startFreeTrial() {

        if (!upgradeButton) {

            console.error(
                "❌ upgradeButton was not found."
            );

            return;

        }

        if (
            upgradeButton.dataset.processing ===
            "true"
        ) {

            return;

        }

        const originalText =
            upgradeButton.textContent;

        upgradeButton.dataset.processing =
            "true";

        upgradeButton.disabled =
            true;

        upgradeButton.textContent =
            "⏳ Starting Free Trial...";

        if (billingMessageElement) {

            billingMessageElement.innerHTML =
                "Connecting to Shopify billing...";

        }

        try {

            // --------------------------------------------------
            // GET SHOP
            // --------------------------------------------------

            const shop =
                getShopDomain();

            console.log(
                "💳 Starting trial for:",
                shop
            );

            if (!shop) {

                throw new Error(
                    "Auditly Pro could not determine your connected Shopify store. Please connect your Shopify store first."
                );

            }


            // --------------------------------------------------
            // CALL BILLING ROUTE
            // --------------------------------------------------

            const billingUrl =
                "/billing/upgrade?shop=" +
                encodeURIComponent(shop);

            console.log(
                "💳 Billing request:",
                billingUrl
            );

            const response =
                await fetch(
                    billingUrl,
                    {
                        method: "POST",

                        headers: {
                            "Accept":
                                "application/json",

                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "include",

                        cache:
                            "no-store",

                        body:
                            JSON.stringify({
                                shop: shop
                            })
                    }
                );


            const responseText =
                await response.text();

            console.log(
                "💳 Billing raw response:",
                responseText
            );


            let data;

            try {

                data =
                    JSON.parse(
                        responseText
                    );

            } catch (error) {

                throw new Error(
                    "The billing server returned an invalid response."
                );

            }


            console.log(
                "💳 Billing response:",
                data
            );


            // --------------------------------------------------
            // BILLING ERROR
            // --------------------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    data.details ||
                    `Billing failed with HTTP ${response.status}.`
                );

            }


            // --------------------------------------------------
            // SHOPIFY CONFIRMATION URL
            // --------------------------------------------------

            const confirmationUrl =
                data.confirmationUrl ||
                data.confirmation_url ||
                data.url;


            if (!confirmationUrl) {

                throw new Error(
                    "Shopify did not return a subscription confirmation URL."
                );

            }


            console.log(
                "✅ Shopify billing confirmation URL received."
            );

            console.log(
                "➡️ Redirecting to Shopify..."
            );


            if (billingMessageElement) {

                billingMessageElement.innerHTML =
                    "✅ Redirecting you to Shopify...";

            }


            // --------------------------------------------------
            // SEND MERCHANT TO SHOPIFY
            // --------------------------------------------------

            window.location.assign(
                confirmationUrl
            );

        } catch (error) {

            console.error(
                "❌ FREE TRIAL ERROR:",
                error
            );

            if (billingMessageElement) {

                billingMessageElement.innerHTML =
                    "❌ " +
                    error.message;

            }

            alert(
                "Unable to start your 7 day free trial.\n\n" +
                error.message
            );

            upgradeButton.disabled =
                false;

            upgradeButton.dataset.processing =
                "false";

            upgradeButton.textContent =
                originalText;

        }

    }


    // ==========================================================
    // RUN STORE AUDIT
    // ==========================================================

    async function runStoreAudit() {

        if (!auditButton) {

            console.error(
                "❌ auditButton was not found."
            );

            return;

        }

        if (
            auditButton.dataset.processing ===
            "true"
        ) {

            return;

        }

        const originalText =
            auditButton.textContent;

        auditButton.dataset.processing =
            "true";

        auditButton.disabled =
            true;

        auditButton.textContent =
            "⏳ Running Audit...";


        if (resultsElement) {

            resultsElement.innerHTML =
                "⏳ Analyzing your Shopify store...";

        }


        try {

            // --------------------------------------------------
            // GET SHOP
            // --------------------------------------------------

            const shop =
                getShopDomain();

            console.log(
                "🔍 Running audit for:",
                shop
            );


            if (!shop) {

                throw new Error(
                    "Auditly Pro could not determine your connected Shopify store."
                );

            }


            // --------------------------------------------------
            // CALL AUDIT API WITH REQUIRED SHOP PARAMETER
            // --------------------------------------------------

            const auditUrl =
                "/api/audit?shop=" +
                encodeURIComponent(shop);


            console.log(
                "🔍 Audit request:",
                auditUrl
            );


            const response =
                await fetch(
                    auditUrl,
                    {
                        method: "POST",

                        headers: {
                            "Accept":
                                "application/json",

                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "include",

                        cache:
                            "no-store",

                        body:
                            JSON.stringify({
                                shop: shop
                            })
                    }
                );


            const responseText =
                await response.text();


            console.log(
                "🔍 Audit raw response:",
                responseText
            );


            let data;

            try {

                data =
                    JSON.parse(
                        responseText
                    );

            } catch (error) {

                throw new Error(
                    "The audit server returned an invalid response."
                );

            }


            console.log(
                "🔍 Audit response:",
                data
            );


            // --------------------------------------------------
            // AUDIT ERROR
            // --------------------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    data.details ||
                    `Audit failed with HTTP ${response.status}.`
                );

            }


            // --------------------------------------------------
            // DISPLAY RESULTS
            // --------------------------------------------------

            if (resultsElement) {

                resultsElement.innerHTML =
                    formatAuditResults(
                        data
                    );

            }


            console.log(
                "🎉 STORE AUDIT COMPLETED"
            );

        } catch (error) {

            console.error(
                "❌ AUDIT ERROR:",
                error
            );


            if (resultsElement) {

                resultsElement.innerHTML = `
                    <div>
                        ❌ <strong>Audit failed</strong>
                        <br><br>
                        ${escapeHtml(
                            error.message
                        )}
                    </div>
                `;

            }


            alert(
                "Unable to complete the store audit.\n\n" +
                error.message
            );

        } finally {

            auditButton.disabled =
                false;

            auditButton.dataset.processing =
                "false";

            auditButton.textContent =
                originalText;

        }

    }


    // ==========================================================
    // FORMAT AUDIT RESULTS
    // ==========================================================

    function formatAuditResults(data) {

        if (!data) {

            return `
                <p>
                    Audit completed, but no results were returned.
                </p>
            `;

        }


        // Handle a normal object response.
        let html = `
            <h3>🎉 Audit Complete</h3>
        `;


        if (
            data.score !== undefined
        ) {

            html += `
                <p>
                    <strong>Score:</strong>
                    ${escapeHtml(
                        String(data.score)
                    )}/100
                </p>
            `;

        }


        if (
            data.summary
        ) {

            html += `
                <p>
                    ${escapeHtml(
                        String(data.summary)
                    )}
                </p>
            `;

        }


        // Display returned audit information.
        if (
            data.results
        ) {

            html +=
                renderObject(
                    data.results
                );

        } else if (
            data.audit
        ) {

            html +=
                renderObject(
                    data.audit
                );

        } else {

            html +=
                renderObject(
                    data
                );

        }


        return html;

    }


    // ==========================================================
    // RENDER OBJECT
    // ==========================================================

    function renderObject(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        if (
            typeof value !== "object"
        ) {

            return `
                <p>
                    ${escapeHtml(
                        String(value)
                    )}
                </p>
            `;

        }


        let html =
            "<div>";


        for (
            const [key, item]
            of Object.entries(value)
        ) {

            if (
                key === "score" ||
                key === "summary"
            ) {

                continue;

            }


            if (
                typeof item === "object" &&
                item !== null
            ) {

                html += `
                    <div style="margin-top:10px;">
                        <strong>
                            ${escapeHtml(
                                formatKey(key)
                            )}
                        </strong>
                        ${renderObject(item)}
                    </div>
                `;

            } else {

                html += `
                    <p>
                        <strong>
                            ${escapeHtml(
                                formatKey(key)
                            )}:
                        </strong>
                        ${escapeHtml(
                            String(item)
                        )}
                    </p>
                `;

            }

        }


        html += "</div>";


    
