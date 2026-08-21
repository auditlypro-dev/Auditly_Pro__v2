// ==========================================
// Auditly Pro v2
// Dashboard JavaScript
// Shopify Connection + Billing + Store Audit
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");


    // ==========================================
    // FIND SHOPIFY STORE
    // ==========================================

    function getShopFromUrl() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        return (
            params.get("shop") ||
            params.get("shopifyShop") ||
            ""
        );

    }


    function getStoredShop() {

        try {

            return (
                localStorage.getItem(
                    "auditly_shop"
                ) || ""
            );

        } catch (error) {

            console.error(
                "❌ Unable to read saved shop:",
                error
            );

            return "";

        }

    }


    function saveShop(shop) {

        if (!shop) {
            return;
        }

        try {

            localStorage.setItem(
                "auditly_shop",
                shop
            );

            console.log(
                "💾 Shopify shop saved:",
                shop
            );

        } catch (error) {

            console.error(
                "❌ Unable to save shop:",
                error
            );

        }

    }


    let shop =
        getShopFromUrl() ||
        getStoredShop();


    if (shop) {

        saveShop(shop);

        console.log(
            "🏪 Current Shopify shop:",
            shop
        );

    } else {

        console.warn(
            "⚠️ No Shopify shop was provided."
        );

    }


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
    // SHOW SHOP REQUIRED MESSAGE
    // ==========================================

    function showShopRequired() {

        if (shopStatusElement) {

            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Shopify Store Not Connected
                </strong>

                <br><br>

                Auditly Pro needs to know which
                Shopify store you are using.

                <br><br>

                <a
                    href="/auth/install"
                >
                    Connect Shopify Store
                </a>

            `;

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
            return;
        }


        if (!shop) {

            showShopRequired();

            return;

        }


        shopStatusElement.innerHTML =
            "🔄 Checking Shopify connection...";


        try {

            const response =
                await fetch(
                    `/api/store?shop=${encodeURIComponent(shop)}`
                );


            const data =
                await response.json();


            console.log(
                "🏪 Shopify connection response:",
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

                    <div>

                        🟢
                        <strong>
                            Shopify Store Connected
                        </strong>

                        <br><br>

                        <strong>
                            ${escapeHtml(
                                store.name ||
                                "Shopify Store"
                            )}
                        </strong>

                        <br>

                        ${escapeHtml(
                            store.myshopifyDomain ||
                            shop
                        )}

                        <br><br>

                        Currency:
                        ${escapeHtml(
                            store.currencyCode ||
                            "USD"
                        )}

                    </div>

                `;

                return;

            }


            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Shopify Store Not Connected
                </strong>

                <br><br>

                <a
                    href="/auth/install?shop=${encodeURIComponent(shop)}"
                >
                    Connect Shopify Store
                </a>

            `;


        } catch (error) {

            console.error(
                "❌ Shopify connection check failed:",
                error
            );


            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Unable to check Shopify connection.
                </strong>

                <br><br>

                Please try connecting your Shopify
                store again.

            `;

        }

    }


    // ==========================================
    // CHECK BILLING STATUS
    // ==========================================

    async function checkBillingStatus() {

        if (!billingStatusElement) {
            return;
        }


        if (!shop) {

            billingStatusElement.innerHTML = `

                🟡
                <strong>
                    Connect your Shopify store first.
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


                if (upgradeButton) {

                    upgradeButton.disabled =
                        false;

                    upgradeButton.innerHTML =
                        "🚀 Start 7-Day Free Trial";

                }


            } else {

                billingStatusElement.innerHTML = `

                    🟡
                    <strong>
                        Subscription status unavailable
                    </strong>

                `;

            }

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


                // ----------------------------------
                // Make sure we know the shop
                // ----------------------------------

                if (!shop) {

                    if (billingMessageElement) {

                        billingMessageElement.innerHTML = `

                            <div>

                                🔴
                                <strong>
                                    Unable to start your
                                    7-day free trial.
                                </strong>

                                <br><br>

                                Auditly Pro could not
                                determine your connected
                                Shopify store.

                                <br><br>

                                Please connect your
                                Shopify store first.

                            </div>

                        `;

                    }

                    return;

                }


                // ----------------------------------
                // Disable button
                // ----------------------------------

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

                    // ----------------------------------
                    // Ask server to create subscription
                    // ----------------------------------

                    const response =
                        await fetch(
                            `/billing/upgrade?shop=${encodeURIComponent(shop)}`,
                            {

                                method: "POST",

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


                    // ----------------------------------
                    // Shopify confirmation URL
                    // ----------------------------------

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
                                        Your 7-day free trial
                                        is ready!
                                    </strong>

                                    <br><br>

                                    Redirecting you to
                                    Shopify to approve
                                    the subscription...

                                </div>

                            `;

                        }


                        window.location.href =
                            data.confirmationUrl;


                        return;

                    }


                    // ----------------------------------
                    // Already subscribed
                    // ----------------------------------

                    if (
                        response.ok &&
                        data.success &&
                        data.alreadySubscribed
                    ) {

                        if (billingStatusElement) {

                            billingStatusElement.innerHTML = `

                                🟢
                                <strong>
                                    Auditly Pro Subscription Active
                                </strong>

                            `;

                        }


                        if (billingMessageElement) {

                            billingMessageElement.innerHTML = `

                                🟢
                                <strong>
                                    You already have an
                                    active Auditly Pro
                                    subscription.
                                </strong>

                            `;

                        }


                        upgradeButton.disabled =
                            true;

                        upgradeButton.innerHTML =
                            "✅ Auditly Pro Active";

                        return;

                    }


                    // ----------------------------------
                    // Error returned by server
                    // ----------------------------------

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
                                        : JSON.stringify(
                                            errorMessage
                                        )
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

        if (!findings.length) {

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

                        <strong>
                            ${escapeHtml(product)}
                        </strong>

                        <br><br>

                        ${escapeHtml(message)}

                        <br><br>

                        <strong>
                            Severity:
                        </strong>

                        ${escapeHtml(severity)}

                        ${
                            recommendation
                                ? `

                                    <br><br>

                                    <strong>
                                        💡 Recommendation:
                                    </strong>

                                    <br>

                                    ${escapeHtml(
                                        recommendation
                                    )}

                                `
                                : ""
                        }

                    </div>

                `;

            }
        ).join("");

    }


    // ==========================================
    // RENDER RECOMMENDATIONS
    // ==========================================

    function renderRecommendations(
        recommendations
    ) {

        if (!recommendations.length) {

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


        const score =
            Number.isFinite(
                Number(data.score)
            )
                ? Number(data.score)
                : null;


        const rating =
            data.rating ||
            "Audit Incomplete";


        const summary =
            data.summary ||
            {};


        const totalProducts =
            Number(
                summary.totalProducts ||
                0
            );


        const productsWithIssues =
            Number(
                summary.productsWithIssues ||
                0
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
    // =============================
    
    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "🔍 Run Store Audit clicked"
                );


                // ----------------------------------
                // Make sure we know the shop
                // ----------------------------------

                if (!shop) {

                    if (resultsElement) {

                        resultsElement.innerHTML = `

                            🔴
                            <strong>
                                Audit could not be started.
                            </strong>

                            <br><br>

                            Auditly Pro could not
                            determine your connected
                            Shopify store.

                            <br><br>

                            Please connect your
                            Shopify store first.

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

                                method: "POST",

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

                        renderAuditResults(
                            data
                        );

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

    }


    // ==========================================
    // INITIALIZE DASHBOARD
    // ==========================================

    checkServer();

    checkShopifyConnection();

    checkBillingStatus();

});                    
