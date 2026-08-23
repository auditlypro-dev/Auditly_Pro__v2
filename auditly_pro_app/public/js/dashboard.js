// ==========================================
// Auditly Pro v2
// Dashboard JavaScript
// Shopify Connection + Billing + Store Audit
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");


    // ==========================================
    // SHOP IDENTIFICATION
    // ==========================================
    // Shopify should open the dashboard with:
    //
    // /dashboard?shop=merchant-store.myshopify.com
    //
    // IMPORTANT:
    // There is NO hardcoded test-store fallback.
    // The merchant's actual Shopify store is required.
    // ==========================================

    const urlParams =
        new URLSearchParams(window.location.search);

    const shop =
        urlParams.get("shop");


    console.log(
        "🏪 Dashboard shop:",
        shop || "NO SHOP PROVIDED"
    );


    // ==========================================
    // DASHBOARD ELEMENTS
    // ==========================================

    const statusElement =
        document.getElementById("status");

    const shopStatusElement =
        document.getElementById("shopStatus");

    const auditButton =
        document.getElementById("auditButton");

    const resultsElement =
        document.getElementById("results");


    // ==========================================
    // BILLING ELEMENTS
    // ==========================================

    const upgradeButton =
        document.getElementById("upgradeButton");

    const billingStatusElement =
        document.getElementById("billingStatus");

    const billingMessageElement =
        document.getElementById("billingMessage");


    // ==========================================
    // ESCAPE HTML
    // ==========================================

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // ==========================================
    // VALIDATE SHOP
    // ==========================================

    function hasValidShop() {

        if (!shop) {
            return false;
        }

        return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i
            .test(shop);

    }


    // ==========================================
    // HANDLE MISSING SHOP
    // ==========================================

    function showMissingShop() {

        console.warn(
            "⚠️ No Shopify shop parameter was provided."
        );


        if (shopStatusElement) {

            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Shopify Store Not Identified
                </strong>

                <br><br>

                Auditly Pro could not identify the
                connected Shopify store.

                <br><br>

                Please open Auditly Pro from your
                Shopify Admin.

            `;

        }


        if (billingStatusElement) {

            billingStatusElement.innerHTML = `

                🟡
                <strong>
                    Subscription status unavailable
                </strong>

                <br><br>

                Auditly Pro could not identify
                the Shopify store.

            `;

        }


        if (auditButton) {

            auditButton.disabled = true;

        }

    }


    // ==========================================
    // CHECK SERVER
    // ==========================================

    async function checkServer() {

        try {

            const response =
                await fetch(
                    "/dashboard/health"
                );


            const data =
                await response.json();


            console.log(
                "🖥️ Server health:",
                data
            );


            if (
                response.ok &&
                data.success &&
                data.server === "Online"
            ) {

                if (statusElement) {

                    statusElement.innerHTML =
                        "🟢 <strong>Online</strong>";

                }

            } else {

                if (statusElement) {

                    statusElement.innerHTML =
                        "🟡 Server responded, but status is unknown.";

                }

            }

        } catch (error) {

            console.error(
                "❌ Server health check failed:",
                error
            );


            if (statusElement) {

                statusElement.innerHTML =
                    "🔴 Unable to connect to server.";

            }

        }

    }


    // ==========================================
    // CHECK SHOPIFY CONNECTION
    // ==========================================

    async function checkShopifyConnection() {

        if (!shopStatusElement) {

            console.error(
                "❌ shopStatus element was not found."
            );

            return;

        }


        if (!hasValidShop()) {

            showMissingShop();

            return;

        }


        shopStatusElement.innerHTML =
            "🔄 Checking Shopify connection...";


        try {

            const apiUrl =
                `/api/store?shop=${encodeURIComponent(shop)}`;


            console.log(
                "🔎 Checking Shopify store:",
                apiUrl
            );


            const response =
                await fetch(apiUrl);


            const data =
                await response.json();


            console.log(
                "🏪 Shopify connection response:",
                data
            );


            // ======================================
            // SUCCESS
            // ======================================

            if (
                response.ok &&
                data.success === true &&
                data.shop
            ) {

                const store =
                    data.shop;


                const storeName =
                    store.name ||
                    "Shopify Store";


                const storeDomain =
                    store.myshopifyDomain ||
                    shop;


                const currency =
                    store.currencyCode ||
                    "USD";


                shopStatusElement.innerHTML = `

                    <div>

                        🟢
                        <strong>
                            Shopify Store Connected
                        </strong>

                        <br><br>

                        <strong>
                            ${escapeHtml(storeName)}
                        </strong>

                        <br>

                        ${escapeHtml(storeDomain)}

                        <br><br>

                        Currency:
                        ${escapeHtml(currency)}

                    </div>

                `;


                console.log(
                    "✅ Shopify store connected:",
                    storeDomain
                );


                return;

            }


            // ======================================
            // SHOP NOT FOUND
            // ======================================

            if (response.status === 404) {

                console.warn(
                    "⚠️ Shop was not found in Supabase:",
                    shop
                );


                shopStatusElement.innerHTML = `

                    🔴
                    <strong>
                        Shopify Store Not Connected
                    </strong>

                    <br><br>

                    Auditly Pro could not find this
                    Shopify store in its database.

                    <br><br>

                    Please connect your Shopify store
                    through Shopify Admin.

                `;


                return;

            }


            // ======================================
            // OTHER API ERROR
            // ======================================

            console.error(
                "❌ Shopify API returned an error:",
                data
            );


            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Unable to verify Shopify connection
                </strong>

                <br><br>

                ${escapeHtml(
                    data.error ||
                    data.message ||
                    data.details ||
                    "Unknown server error."
                )}

            `;


        } catch (error) {

            console.error(
                "❌ Shopify connection request failed:",
                error
            );


            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Unable to check Shopify connection
                </strong>

                <br><br>

                ${escapeHtml(
                    error.message ||
                    "Network error."
                )}

            `;

        }

    }


    // ==========================================
    // CHECK BILLING STATUS
    // ==========================================

    async function checkBillingStatus() {

        if (!billingStatusElement) {

            console.log(
                "ℹ️ Billing status element not found."
            );

            return;

        }


        if (!hasValidShop()) {

            billingStatusElement.innerHTML = `

                🟡
                <strong>
                    Subscription status unavailable
                </strong>

            `;

            return;

        }


        billingStatusElement.innerHTML =
            "🔄 Checking subscription status...";


        try {

            const response =
                await fetch(
                    `/billing/status?shop=${encodeURIComponent(shop)}`
                );


            const data =
                await response.json();


            console.log(
                "💳 Billing status response:",
                data
            );


            if (
                response.ok &&
                data.success
            ) {

                if (data.active) {

                    billingStatusElement.innerHTML = `

                        🟢
                        <strong>
                            Auditly Pro Subscription Active
                        </strong>

                    `;


                    if (upgradeButton) {

                        upgradeButton.disabled =
                            true;

                        upgradeButton.innerHTML =
                            "✅ Auditly Pro Active";

                    }


                    if (billingMessageElement) {

                        billingMessageElement.innerHTML =
                            "";

                    }


                    return;

                }


                billingStatusElement.innerHTML = `

                    🟡
                    <strong>
                        No active Auditly Pro subscription
                    </strong>

                `;


                return;

            }


            billingStatusElement.innerHTML = `

                🟡
                <strong>
                    Subscription status unavailable
                </strong>

            `;

        } catch (error) {

            console.error(
                "❌ Billing status check failed:",
                error
            );


            billingStatusElement.innerHTML = `

                🟡
                <strong>
                    Unable to check subscription status.
                </strong>

            `;

        }

    }


    // ==========================================
    // START 7-DAY FREE TRIAL
    // ==========================================

    if (upgradeButton) {

        upgradeButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "🚀 Start 7-Day Free Trial clicked"
                );


                if (!hasValidShop()) {

                    console.error(
                        "❌ Cannot start trial: no valid Shopify shop."
                    );


                    if (billingMessageElement) {

                        billingMessageElement.innerHTML = `

                            <div>

                                🔴
                                <strong>
                                    Unable to start your
                                    7-day free trial.
                                </strong>

                                <br><br>

                                Auditly Pro could not identify
                                your Shopify store.

                                <br><br>

                                Please open Auditly Pro
                                from Shopify Admin.

                            </div>

                        `;

                    }


                    return;

                }


                upgradeButton.disabled =
                    true;


                upgradeButton.innerHTML =
                    "🔄 Starting 7-Day Free Trial...";


                if (billingMessageElement) {

                    billingMessageElement.innerHTML = `

                        <div>

                            🔄
                            <strong>
                                Connecting to Shopify billing...
                            </strong>

                            <br><br>

                            Please wait.

                        </div>

                    `;

                }


                try {

                    const response =
                        await fetch(
                            `/billing/upgrade?shop=${encodeURIComponent(shop)}`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({
                                        shop: shop
                                    })

                            }
                        );


                    const data =
                        await response.json();


                    console.log(
                        "💳 Billing upgrade response:",
                        data
                    );


                    if (
                        response.ok &&
                        data.success &&
                        data.confirmationUrl
                    ) {

                        if (billingMessageElement) {

                            billingMessageElement.innerHTML = `

                                <div>

                                    🟢
                                    <strong>
                                        Your 7-day free trial is ready!
                                    </strong>

                                    <br><br>

                                    Redirecting you to Shopify
                                    to approve the subscription...

                                </div>

                            `;

                        }


                        window.location.href =
                            data.confirmationUrl;


                        return;

                    }


                    const errorMessage =
                        data.error ||
                        data.message ||
                        data.details ||
                        "Unable to start the 7-day free trial.";


                    console.error(
                        "❌ Billing upgrade failed:",
                        data
                    );


                    if (billingMessageElement) {

                        billingMessageElement.innerHTML = `

                            <div>

                                🔴
                                <strong>
                                    Unable to start your
                                    7-day free trial.
                                </strong>

                                <br><br>

                                ${escapeHtml(
                                    typeof errorMessage === "string"
                                        ? errorMessage
                                        : JSON.stringify(errorMessage)
                                )}

                            </div>

                        `;

                    }


                    upgradeButton.disabled =
                        false;


                    upgradeButton.innerHTML =
                        "🚀 Start 7-Day Free Trial";


                } catch (error) {

                    console.error(
                        "❌ Billing request failed:",
                        error
                    );


                    if (billingMessageElement) {

                        billingMessageElement.innerHTML = `

                            <div>

                                🔴
                                <strong>
                                    Unable to start your
                                    7-day free trial.
                                </strong>

                                <br><br>

                                ${escapeHtml(
                                    error.message ||
                                    "Network error."
                                )}

                            </div>

                        `;

                    }


                    upgradeButton.disabled =
                        false;


                    upgradeButton.innerHTML =
                        "🚀 Start 7-Day Free Trial";

                }

            }
        );

    } else {

        console.error(
            "❌ upgradeButton was not found in dashboard.html"
        );

    }


    // ==========================================
    // RENDER FINDINGS
    // ==========================================

    function renderFindings(findings) {

        if (
            !Array.isArray(findings) ||
            findings.length === 0
        ) {

            return `

                <div style="
                    padding:15px;
                    border:1px solid #ddd;
                    border-radius:8px;
                ">

                    🟢
                    <strong>
                        No product issues were detected.
                    </strong>

                </div>

            `;

        }


        return findings.map(
            finding => {

                const category =
                    finding.category ||
                    "General";


                const product =
                    finding.productTitle ||
                    "Store";


                const message =
                    finding.message ||
                    "Issue detected.";


                const severity =
                    finding.severity ||
                    "notice";


                const recommendation =
                    finding.recommendation;


                return `

                    <div style="
                        margin-bottom:15px;
                        padding:15px;
                        border:1px solid #ddd;
                        border-radius:8px;
                    ">

                        <strong>
                            ${escapeHtml(category)}
                        </strong>

                        <br><br>

                       // ==========================================
    // RENDER RECOMMENDATIONS
    // ==========================================

    function renderRecommendations(
        recommendations
    ) {

        if (
            !Array.isArray(recommendations) ||
            recommendations.length === 0
        ) {

            return `

                <p>
                    No additional recommendations available.
                </p>

            `;

        }


        return recommendations.map(
            recommendation => {

                return `

                    <div style="
                        margin-bottom:15px;
                        padding:15px;
                        border:1px solid #ddd;
                        border-radius:8px;
                    ">

                        <strong>
                            ${escapeHtml(
                                recommendation.priority ||
                                "General"
                            )}
                        </strong>

                        <br><br>

                        <strong>
                            ${escapeHtml(
                                recommendation.category ||
                                "Optimization"
                            )}
                        </strong>

                        <br><br>

                        ${escapeHtml(
                            recommendation.recommendation ||
                            ""
                        )}

                    </div>

                `;

            }
        ).join("");

    }


    // ==========================================
    // RENDER AUDIT RESULTS
    // ==========================================

    function renderAuditResults(data) {

        if (!resultsElement) {

            return;

        }


        const scoreNumber =
            Number(data.score);


        const score =
            Number.isFinite(scoreNumber)
                ? scoreNumber
                : null;


        const rating =
            data.rating ||
            "Audit Incomplete";


        const summary =
            data.summary || {};


        const totalProducts =
            Number(
                summary.totalProducts || 0
            );


        const productsWithIssues =
            Number(
                summary.productsWithIssues || 0
            );


        const findings =
            Array.isArray(data.findings)
                ? data.findings
                : [];


        const recommendations =
            Array.isArray(
                data.recommendations
            )
                ? data.recommendations
                : [];


        const scoreDisplay =
            score === null
                ? "N/A"
                : `${score}/100`;


        let zeroProductWarning =
            "";


        if (totalProducts === 0) {

            zeroProductWarning = `

                <div style="
                    margin:20px 0;
                    padding:15px;
                    border:1px solid #f0ad4e;
                    border-radius:8px;
                    background:#fff8e8;
                ">

                    ⚠️
                    <strong>
                        No products were found.
                    </strong>

                    <br><br>

                    Auditly Pro could not perform
                    a meaningful product audit.

                </div>

            `;

        }


        resultsElement.innerHTML = `

            <div>

                <h2>
                    🧾 Audit Results
                </h2>

                <div style="
                    margin:20px 0;
                    padding:20px;
                    border:1px solid #ddd;
                    border-radius:10px;
                    text-align:center;
                ">

                    <div style="
                        font-size:42px;
                        font-weight:bold;
                    ">

                        ${scoreDisplay}

                    </div>

                    <div style="
                        font-size:20px;
                        margin-top:5px;
                    ">

                        ${escapeHtml(rating)}

                    </div>

                </div>


                <div style="
                    margin-bottom:20px;
                    padding:15px;
                    border:1px solid #ddd;
                    border-radius:8px;
                ">

                    <strong>
                        Store:
                    </strong>

                    ${escapeHtml(
                        data.shop ||
                        shop ||
                        "Unknown"
                    )}

                    <br><br>

                    <strong>
                        Products Audited:
                    </strong>

                    ${totalProducts}

                    <br>

                    <strong>
                        Products With Issues:
                    </strong>

                    ${productsWithIssues}

                </div>


                ${zeroProductWarning}


                <h3>
                    🔍 Findings
                </h3>

                ${renderFindings(findings)}


                <h3 style="
                    margin-top:25px;
                ">

                    💡 Recommendations

                </h3>

                ${renderRecommendations(
                    recommendations
                )}


                <div style="
                    margin-top:25px;
                    font-size:13px;
                    opacity:.7;
                ">

                    Audit completed:

                    ${escapeHtml(
                        data.auditDate ||
                        new Date().toISOString()
                    )}

                </div>

            </div>

        `;

    }


    // ==========================================
    // RUN STORE AUDIT
    // ==========================================

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "🔍 Run Store Audit clicked"
                );


                if (!hasValidShop()) {

                    console.error(
                        "❌ Cannot run audit: no valid Shopify shop."
                    );


                    if (resultsElement) {

                        resultsElement.innerHTML = `

                            🔴
                            <strong>
                                Unable to run store audit.
                            </strong>

                            <br><br>

                            Auditly Pro could not identify
                            your Shopify store.

                            <br><br>

                            Please open Auditly Pro
                            from Shopify Admin.

                        `;

                    }


                    return;

                }


                auditButton.disabled =
                    true;


                if (resultsElement) {

                    resultsElement.innerHTML = `

                        🔄
                        <strong>
                            Running Store Audit...
                        </strong>

                        <br><br>

                        Auditly Pro is analyzing
                        your Shopify store.

                    `;

                }


                try {

                    const response =
                        await fetch(
                            `/api/audit?shop=${encodeURIComponent(shop)}`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                }

                            }
                        );


                    const data =
                        await response.json();


                    console.log(
                        "🔍 Audit response:",
                        data
                    );


                    if (
                        response.ok &&
                        data.success
                    ) {

                        renderAuditResults(data);

                        return;

                    }


                    if (resultsElement) {

                        resultsElement.innerHTML = `

                            🔴
                            <strong>
                                Audit could not be completed.
                            </strong>

                            <br><br>

                            ${escapeHtml(
                                data.error ||
                                data.message ||
                                data.details ||
                                "Unknown error."
                            )}

                        `;

                    }

                } catch (error) {

                    console.error(
                        "❌ Audit request failed:",
                        error
                    );


                    if (resultsElement) {

                        resultsElement.innerHTML = `

                            🔴
                            <strong>
                                Unable to complete audit.
                            </strong>

                            <br><br>

                            ${escapeHtml(
                                error.message ||
                                "Network error."
                            )}

                        `;

                    }

                } finally {

                    auditButton.disabled =
                        false;

                }

            }
        );

    } else {

        console.error(
            "❌ auditButton was not found in dashboard.html"
        );

    }


    // ==========================================
    // UPDATE CONNECT SHOP LINK
    // ==========================================
    // If a valid shop exists, preserve it when
    // the merchant uses the Connect button.
    // No test store is ever inserted.
    // ==========================================

    const connectShop =
        document.getElementById("connectShop");


    if (connectShop) {

        if (hasValidShop()) {

            connectShop.href =
                `/auth/install?shop=${encodeURIComponent(shop)}`;

        } else {

            connectShop.removeAttribute("href");

            connectShop.style.pointerEvents =
                "none";

            connectShop.style.opacity =
                "0.6";

        }

    }


    // ==========================================
    // INITIALIZE DASHBOARD
    // ==========================================

    console.log(
        "🚀 Initializing Auditly Pro dashboard..."
    );


    checkServer();

    checkShopifyConnection();

    checkBillingStatus();

});
