// ==========================================
// Auditly Pro v2
// Complete Dashboard JavaScript
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const shop = "auditly-pro-app.myshopify.com";


    // ==========================================
    // DASHBOARD ELEMENTS
    // ==========================================

    const statusElement =
        document.getElementById("status");

    const shopStatusElement =
        document.getElementById("shopStatus");

    const billingStatusElement =
        document.getElementById("billingStatus");

    const billingMessageElement =
        document.getElementById("billingMessage");

    const upgradeButton =
        document.getElementById("upgradeButton");

    const auditButton =
        document.getElementById("auditButton");

    const resultsElement =
        document.getElementById("results");


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
    // SEVERITY DISPLAY
    // ==========================================

    function severityLabel(severity) {

        const value =
            String(severity || "notice").toLowerCase();

        switch (value) {

            case "critical":
                return "🔴 Critical";

            case "high":
                return "🔴 High";

            case "medium":
                return "🟠 Medium";

            case "low":
                return "🟢 Low";

            case "notice":
            default:
                return "🟡 Notice";

        }

    }


    // ==========================================
    // SERVER HEALTH
    // ==========================================

    async function checkServer() {

        if (!statusElement) {
            return;
        }

        try {

            const response =
                await fetch("/dashboard/health");

            const data =
                await response.json();


            if (
                response.ok &&
                data.success &&
                data.server === "Online"
            ) {

                statusElement.innerHTML =
                    "🟢 <strong>Online</strong>";

            } else {

                statusElement.innerHTML =
                    "🟡 Server responded, but status is unknown.";

            }

        } catch (error) {

            console.error(
                "❌ Server health check failed:",
                error
            );

            statusElement.innerHTML =
                "🔴 Unable to connect to server.";

        }

    }


    // ==========================================
    // SHOPIFY CONNECTION
    // ==========================================

    async function checkShopifyConnection() {

        if (!shopStatusElement) {
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
                            "N/A"
                        )}

                    </div>

                `;

            } else {

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

            }

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
                    "Unknown error."
                )}

            `;

        }

    }


    // ==========================================
    // CHECK SUBSCRIPTION STATUS
    // ==========================================

    async function checkSubscriptionStatus() {

        if (!billingStatusElement) {
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
                "💳 Billing status:",
                data
            );


            if (
                response.ok &&
                data.success &&
                data.active
            ) {

                billingStatusElement.innerHTML = `

                    <div>

                        🟢
                        <strong>
                            Auditly Pro Subscription Active
                        </strong>

                        <br><br>

                        Plan:
                        <strong>
                            Auditly Pro
                        </strong>

                        <br>

                        Price:
                        <strong>
                            $27/month
                        </strong>

                        <br><br>

                        Status:
                        ${escapeHtml(
                            data.status ||
                            "ACTIVE"
                        )}

                    </div>

                `;


                if (upgradeButton) {

                    upgradeButton.style.display =
                        "none";

                }


                if (billingMessageElement) {

                    billingMessageElement.innerHTML = "";

                }

            } else {

                billingStatusElement.innerHTML = `

                    <div>

                        🟡
                        <strong>
                            No active Auditly Pro subscription
                        </strong>

                        <br><br>

                        <strong>
                            Auditly Pro
                        </strong>

                        <br>

                        $27/month

                        <br>

                        7-day free trial

                    </div>

                `;


                if (upgradeButton) {

                    upgradeButton.style.display =
                        "inline-block";

                }

            }

        } catch (error) {

            console.error(
                "❌ Subscription status check failed:",
                error
            );


            billingStatusElement.innerHTML = `

                🟡
                <strong>
                    Subscription status unavailable.
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

                // ----------------------------------
                // Disable button
                // ----------------------------------

                upgradeButton.disabled = true;


                const originalText =
                    upgradeButton.innerHTML;


                upgradeButton.innerHTML =
                    "🔄 Connecting to Shopify Billing...";


                if (billingMessageElement) {

                    billingMessageElement.innerHTML = `

                        🔄
                        <strong>
                            Connecting to Shopify...
                        </strong>

                        <br><br>

                        Preparing your 7-day free trial.

                    `;

                }


                try {

                    console.log(
                        "💳 Starting Auditly Pro subscription:",
                        shop
                    );


                    // ----------------------------------
                    // Call billing backend
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

                                body: JSON.stringify({
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

                        console.log(
                            "✅ Shopify billing confirmation URL received."
                        );


                        if (billingMessageElement) {

                            billingMessageElement.innerHTML = `

                                🟢
                                <strong>
                                    Redirecting to Shopify...
                                </strong>

                            `;

                        }


                        // ----------------------------------
                        // Send merchant to Shopify
                        // ----------------------------------

                        window.location.href =
                            data.confirmationUrl;


                        return;

                    }


                    // ----------------------------------
                    // Billing error
                    // ----------------------------------

                    console.error(
                        "❌ Billing upgrade failed:",
                        data
                    );


                    if (billingMessageElement) {

                        billingMessageElement.innerHTML = `

                            🔴
                            <strong>
                                Unable to start your free trial.
                            </strong>

                            <br><br>

                            ${escapeHtml(
                                data.error ||
                                data.message ||
                                data.details ||
                                "Shopify did not provide a billing confirmation URL."
                            )}

                        `;

                    }

                } catch (error) {

                    console.error(
                        "❌ Billing request failed:",
                        error
                    );


                    if (billingMessageElement) {

                        billingMessageElement.innerHTML = `

                            🔴
                            <strong>
                                Unable to connect to Shopify billing.
                            </strong>

                            <br><br>

                            ${escapeHtml(
                                error.message ||
                                "Network error."
                            )}

                        `;

                    }

                } finally {

                    // ----------------------------------
                    // Re-enable button
                    // ----------------------------------

                    upgradeButton.disabled =
                        false;


                    upgradeButton.innerHTML =
                        originalText;

                }

            }
        );

    } else {

        console.error(
            "❌ CRITICAL: #upgradeButton was not found."
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

                        ${escapeHtml(
                            severityLabel(severity)
                        )}

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
            Number.isFinite(Number(data.score))
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
            Array.isArray(data.recommendations)
                ? data.recommendations
                : [];


        const scoreDisplay =
            score === null
                ? "N/A"
                : `${score}/100`;


            // ------------------------------------------
        // Zero product warning
        // ------------------------------------------

        let zeroProductWarning = "";


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


        // ------------------------------------------
        // Results
        // ------------------------------------------

        resultsElement.innerHTML = `

            <div>

                <h2>
                    🧾 Audit Results
                </h2>


                <!-- SCORE -->

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


                <!-- SUMMARY -->

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
                        shop
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


                <!-- FINDINGS -->

                <h3>
                    🔍 Findings
                </h3>

                ${renderFindings(findings)}


                <!-- RECOMMENDATIONS -->

                <h3 style="
                    margin-top:25px;
                ">

                    💡 Recommendations

                </h3>

                ${renderRecommendations(
                    recommendations
                )}


                <!-- AUDIT DATE -->

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


                    if (
                        response.ok &&
                        data.success
                    ) {

                        console.log(
                            "✅ Audit results received:",
                            data
                        );


                        renderAuditResults(
                            data
                        );


                        return;

                    }


                    console.error(
                        "❌ Audit failed:",
                        data
                    );


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
            "⚠️ #auditButton was not found."
        );

    }


    // ==========================================
    // INITIALIZE DASHBOARD
    // ==========================================

    console.log(
        "🚀 Auditly Pro dashboard initializing..."
    );


    checkServer();

    checkShopifyConnection();

    checkSubscriptionStatus();


});
