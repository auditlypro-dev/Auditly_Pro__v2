// ==========================================
// Auditly Pro v2
// Dashboard JavaScript
// Shopify Connection + Billing + Store Audit
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");


    // ==========================================
    // CONFIGURATION
    // ==========================================

    const DEFAULT_SHOP =
        "auditly-pro-app.myshopify.com";


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
    // CURRENT SHOP
    // ==========================================

    let currentShop =
        DEFAULT_SHOP;


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
    // GET SHOP FROM URL IF AVAILABLE
    // ==========================================

    function getShopFromUrl() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const shop =
            params.get("shop");

        if (
            shop &&
            shop.endsWith(".myshopify.com")
        ) {

            console.log(
                "🏪 Shop found in URL:",
                shop
            );

            return shop;

        }

        return DEFAULT_SHOP;

    }


    // ==========================================
    // CHECK SERVER
    // ==========================================

    async function checkServer() {

        try {

            const response =
                await fetch(
                    "/dashboard/health",
                    {
                        cache: "no-store"
                    }
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
    // GET SHOPIFY STORE
    // ==========================================

    async function checkShopifyConnection() {

        if (!shopStatusElement) {

            console.error(
                "❌ shopStatus element not found."
            );

            return false;

        }


        shopStatusElement.innerHTML =
            "🔄 Checking Shopify connection...";


        try {

            const shop =
                getShopFromUrl();

            currentShop =
                shop;


            const url =
                `/api/store?shop=${encodeURIComponent(
                    currentShop
                )}`;


            console.log(
                "🏪 Checking Shopify store:",
                currentShop
            );

            console.log(
                "🌐 Store API:",
                url
            );


            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        cache: "no-store",
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                "🏪 Shopify store response:",
                data
            );


            // ======================================
            // STORE SUCCESS
            // ======================================

            if (
                response.ok &&
                data.success === true &&
                data.shop
            ) {

                const store =
                    data.shop;


                // Use the actual Shopify domain
                // returned by the server.

                if (
                    store.myshopifyDomain
                ) {

                    currentShop =
                        store.myshopifyDomain;

                }


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
                                "Auditly Pro App"
                            )}
                        </strong>

                        <br>

                        ${escapeHtml(
                            store.myshopifyDomain ||
                            currentShop
                        )}

                        <br><br>

                        Currency:
                        ${escapeHtml(
                            store.currencyCode ||
                            "USD"
                        )}

                    </div>

                `;


                console.log(
                    "✅ Shopify store confirmed:",
                    currentShop
                );


                return true;

            }


            // ======================================
            // STORE NOT FOUND
            // ======================================

            console.warn(
                "⚠️ Shopify store was not confirmed:",
                data
            );


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
                    href="/auth/install?shop=${encodeURIComponent(
                        currentShop
                    )}"
                >
                    Connect Shopify Store
                </a>

            `;


            return false;


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

                ${escapeHtml(
                    error.message ||
                    "Unknown connection error."
                )}

            `;


            return false;

        }

    }


    // ==========================================
    // CHECK BILLING STATUS
    // ==========================================

    async function checkBillingStatus() {

        if (!billingStatusElement) {

            return;

        }


        billingStatusElement.innerHTML =
            "🔄 Checking subscription status...";


        try {

            const response =
                await fetch(
                    `/billing/status?shop=${encodeURIComponent(
                        currentShop
                    )}`,
                    {
                        cache: "no-store"
                    }
                );


            const data =
                await response.json();


            console.log(
                "💳 Billing status:",
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
                            `/billing/upgrade?shop=${encodeURIComponent(
                                currentShop
                            )}`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json",

                                    "Accept":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({
                                        shop:
                                            currentShop
                                    })

                            }
                        );


                    const data =
                        await response.json();


                    console.log(
                        "💳 Billing upgrade response:",
                        data
                    );


                    // ==================================
                    // SUCCESS — GO TO SHOPIFY
                    // ==================================

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


                    // ==================================
                    // ALREADY SUBSCRIBED
                    // ==================================

                    if (
                        response.ok &&
                        data.success &&
                        data.alreadySubscribed
                    ) {

                        if (billingMessageElement) {

                            billingMessageElement.innerHTML = `

                                🟢
                                <strong>
                                    Auditly Pro is already active.
                                </strong>

                            `;

                        }


                        upgradeButton.innerHTML =
                            "✅ Auditly Pro Active";


                        return;

                    }


                    // ==================================
                    // ERROR
                    // ==================================

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
                                    errorMessage
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
                        currentShop
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
                            `/api/audit?shop=${encodeURIComponent(
                                currentShop
                            )}`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json",

                                    "Accept":
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

    } else {

        console.warn(
            "⚠️ auditButton was not found."
        );

    }


    // ==========================================
    // INITIALIZE DASHBOARD
    // ==========================================

    async function initializeDashboard() {

        console.log(
            "🚀 Initializing Auditly Pro dashboard..."
        );


        currentShop =
            getShopFromUrl();


        await checkServer();


        const connected =
            await checkShopifyConnection();


        if (connected) {

            console.log(
                "✅ Store connection confirmed."
            );

            await checkBillingStatus();

        } else {

            console.warn(
                "⚠️ Store connection was not confirmed."
            );

            if (billingStatusElement) {

                billingStatusElement.innerHTML = `

                    🟡
                    <strong>
                        Connect your Shopify store first.
                    </strong>

                `;

            }

        }

    }


    initializeDashboard();

});
