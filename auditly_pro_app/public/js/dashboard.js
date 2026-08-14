// ==========================================
// Auditly Pro v2
// Dashboard JavaScript
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // Configuration
    // ==========================================

    const shop = "auditly-pro-app.myshopify.com";

    const statusElement =
        document.getElementById("status");

    const shopStatusElement =
        document.getElementById("shopStatus");

    const auditButton =
        document.getElementById("auditButton");

    const resultsElement =
        document.getElementById("results");


    // ==========================================
    // Escape HTML
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
    // Severity Display
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
    // Check Server
    // ==========================================

    async function checkServer() {

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
                "Server health check failed:",
                error
            );

            statusElement.innerHTML =
                "🔴 Unable to connect to server.";

        }

    }


    // ==========================================
    // Check Shopify Connection
    // ==========================================

    async function checkShopifyConnection() {

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
                                store.name || "Shopify Store"
                            )}
                        </strong>

                        <br>

                        ${escapeHtml(
                            store.myshopifyDomain || shop
                        )}

                        <br><br>

                        Currency:
                        ${escapeHtml(
                            store.currencyCode || "N/A"
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
                "Shopify connection check failed:",
                error
            );

            shopStatusElement.innerHTML = `

                🔴
                <strong>
                    Unable to check Shopify connection.
                </strong>

            `;

        }

    }


    // ==========================================
    // Render Findings
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


        return findings.map(finding => {

            const category =
                finding.category || "General";

            const product =
                finding.productTitle || "Store";

            const message =
                finding.message || "Issue detected.";

            const severity =
                finding.severity || "notice";

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

        }).join("");

    }


    // ==========================================
    // Render Overall Recommendations
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
    // Render Audit Results
    // ==========================================

    function renderAuditResults(data) {

        const score =
            Number.isFinite(Number(data.score))
                ? Number(data.score)
                : null;

        const rating =
            data.rating ||
            "Audit Incomplete";

        const summary =
            data.summary || {};

        const totalProducts =
            Number(summary.totalProducts || 0);

        const productsWithIssues =
            Number(summary.productsWithIssues || 0);

        const findings =
            Array.isArray(data.findings)
                ? data.findings
                : [];

        const recommendations =
            Array.isArray(data.recommendations)
                ? data.recommendations
                : [];


        // ======================================
        // Score
        // ======================================

        const scoreDisplay =
            score === null
                ? "N/A"
                : `${score}/100`;


        // ======================================
        // Zero Product Warning
        // ======================================

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


        // ======================================
        // Final Results
        // ======================================

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
                        data.shop || shop
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
    // Run Store Audit
    // ==========================================

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async () => {

                auditButton.disabled = true;

                resultsElement.innerHTML = `

                    🔄
                    <strong>
                        Running Store Audit...
                    </strong>

                    <br><br>

                    Auditly Pro is analyzing
                    your Shopify store.

                `;


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

                } catch (error) {

                    console.error(
                        "Audit request failed:",
                        error
                    );

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

                } finally {

                    auditButton.disabled = false;

                }

            }
        );

    }


    // ==========================================
    // Initialize Dashboard
    // ==========================================

    checkServer();

    checkShopifyConnection();

});
