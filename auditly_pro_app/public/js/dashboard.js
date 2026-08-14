// ==========================================
// Auditly Pro v2 Dashboard JavaScript
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // Configuration
    // ==========================================

    const shop =
        "auditly-pro-app.myshopify.com";


    // ==========================================
    // Dashboard Elements
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
    // Check Server
    // ==========================================

    async function checkServer() {

        try {

            const response =
                await fetch("/dashboard/health");

            const data =
                await response.json();

            if (
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

                        <span>
                            Currency:
                            ${escapeHtml(
                                store.currencyCode || "N/A"
                            )}
                        </span>

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
    // Escape HTML
    // ==========================================

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // ==========================================
    // Render Audit Results
    // ==========================================

    function renderAuditResults(data) {

        const score =
            Number.isFinite(Number(data.score))
                ? Number(data.score)
                : 0;

        const rating =
            data.rating ||
            "Unknown";

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
        // Zero-product warning
        // ======================================

        let zeroProductWarning = "";

        if (totalProducts === 0) {

            zeroProductWarning = `

                <div style="
                    margin-top:20px;
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
                    a meaningful product audit because
                    Shopify returned zero products.

                    <br><br>

                    Your store may currently be
                    inactive, empty, paused, or have
                    no products available through the
                    Shopify API.

                </div>

            `;

        }


        // ======================================
        // Findings
        // ======================================

        let findingsHtml = "";

        if (findings.length === 0) {

            findingsHtml = `

                <p>
                    🟢 No product issues were detected.
                </p>

            `;

        } else {

            findingsHtml = findings
                .map((finding) => {

                    const severity =
                        finding.severity ||
                        "notice";

                    const category =
                        finding.category ||
                        "General";

                    const title =
                        finding.productTitle ||
                        "Store";

                    const message =
                        finding.message ||
                        "Issue detected.";

                    return `

                        <div style="
                            margin-bottom:12px;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:8px;
                        ">

                            <strong>
                                ${escapeHtml(category)}
                            </strong>

                            <br>

                            <strong>
                                ${escapeHtml(title)}
                            </strong>

                            <br>

                            <span>
                                ${escapeHtml(message)}
                            </span>

                            <br>

                            <small>
                                Severity:
                                ${escapeHtml(severity)}
                            </small>

                        </div>

                    `;

                })
                .join("");

        }


        // ======================================
        // Recommendations
        // ======================================

        let recommendationsHtml = "";

        if (
            recommendations.length === 0
        ) {

            recommendationsHtml = `
                <p>
                    No recommendations available.
                </p>
            `;

        } else {

            recommendationsHtml =
                recommendations
                    .map((recommendation) => {

                        return `

                            <div style="
                                margin-bottom:12px;
                                padding:12px;
                                border:1px solid #ddd;
                                border-radius:8px;
                            ">

                                <strong>
                                    ${escapeHtml(
                                        recommendation.priority ||
                                        "General"
                                    )}
                                </strong>

                                <br>

                                ${escapeHtml(
                                    recommendation.category ||
                                    "Optimization"
                                )}

                                <br><br>

                                ${escapeHtml(
                                    recommendation.recommendation ||
                                    ""
                                )}

                            </div>

                        `;

                    })
                    .join("");

        }


        // ======================================
        // Display complete audit
        // ======================================

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

                        ${score}/100

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


                <h3>
                    🔍 Findings
                </h3>

                ${findingsHtml}


                <h3 style="margin-top:25px;">
                    💡 Recommendations
                </h3>

                ${recommendationsHtml}


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

                resultsElement.innerHTML = `

                    🔄
                    <strong>
                        Running Store Audit...
                    </strong>

                    <br><br>

                    Auditly Pro is analyzing
                    your Shopify store.

                `;

                auditButton.disabled = true;

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


                    // ==================================
                    // Audit completed successfully
                    // ==================================

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


                    // ==================================
                    // Audit failed
                    // ==================================

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
