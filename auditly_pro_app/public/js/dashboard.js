// ==========================================
// AUDITLY PRO DASHBOARD JAVASCRIPT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");

    // ==========================================
    // ELEMENTS
    // ==========================================

    const statusElement =
        document.getElementById("status");

    const shopElement =
        document.getElementById("shop");

    const subscriptionElement =
        document.getElementById("subscription");

    const resultsElement =
        document.getElementById("audit-results");

    const connectButton =
        document.getElementById("connect-shopify");

    const trialButton =
        document.getElementById("start-trial");

    const auditButton =
        document.getElementById("run-audit");

    // ==========================================
    // GET SHOP PARAMETER
    // ==========================================

    const params =
        new URLSearchParams(window.location.search);

    const shop =
        params.get("shop");

    console.log(
        "Shop parameter:",
        shop
    );

    // ==========================================
    // HTML ESCAPE
    // ==========================================

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }

    // ==========================================
    // CHECK SERVER STATUS
    // ==========================================

    async function checkServerStatus() {

        if (!statusElement) {
            return;
        }

        try {

            const response =
                await fetch("/api/test");

            if (!response.ok) {
                throw new Error(
                    `Server returned ${response.status}`
                );
            }

            const data =
                await response.json();

            console.log(
                "Server status:",
                data
            );

            statusElement.innerHTML =
                "🟢 Online";

        } catch (error) {

            console.error(
                "Server status error:",
                error
            );

            statusElement.innerHTML =
                "🔴 Offline";

        }

    }

    // ==========================================
    // CHECK SHOPIFY CONNECTION
    // ==========================================

    async function checkShopifyConnection() {

        if (!shopElement) {
            return;
        }

        if (!shop) {

            shopElement.innerHTML =
                "⚠️ Shopify store not connected";

            return;

        }

        try {

            const response =
                await fetch(
                    `/api/shop-status?shop=${encodeURIComponent(shop)}`
                );

            if (!response.ok) {
                throw new Error(
                    `Shop status returned ${response.status}`
                );
            }

            const data =
                await response.json();

            console.log(
                "Shopify connection:",
                data
            );

            if (
                data.connected === true ||
                data.success === true
            ) {

                shopElement.innerHTML =
                    `🟢 Connected: ${escapeHtml(
                        data.shop ||
                        shop
                    )}`;

            } else {

                shopElement.innerHTML =
                    "🔴 Shopify store not connected";

            }

        } catch (error) {

            console.error(
                "Shopify connection error:",
                error
            );

            shopElement.innerHTML =
                `🟡 ${escapeHtml(shop)}`;

        }

    }

    // ==========================================
    // CHECK SUBSCRIPTION
    // ==========================================

    async function checkSubscription() {

        if (!subscriptionElement) {
            return;
        }

        if (!shop) {

            subscriptionElement.innerHTML =
                "⚠️ Connect your Shopify store first.";

            return;

        }

        try {

            const response =
                await fetch(
                    `/billing/status?shop=${encodeURIComponent(shop)}`
                );

            if (!response.ok) {

                throw new Error(
                    `Billing status returned ${response.status}`
                );

            }

            const data =
                await response.json();

            console.log(
                "Subscription status:",
                data
            );

            if (
                data.active === true ||
                data.subscribed === true
            ) {

                subscriptionElement.innerHTML =
                    "🟢 Auditly Pro subscription active";

            } else {

                subscriptionElement.innerHTML =
                    "🟡 No active subscription";

            }

        } catch (error) {

            console.error(
                "Subscription status error:",
                error
            );

            subscriptionElement.innerHTML =
                "🟡 Subscription status unavailable";

        }

    }

    // ==========================================
    // CONNECT SHOPIFY STORE
    // ==========================================

    function connectShopify() {

        console.log(
            "Connect Shopify clicked"
        );

        if (shop) {

            window.location.href =
                `/auth/install?shop=${encodeURIComponent(shop)}`;

            return;

        }

        window.location.href =
            "/auth/install";

    }

    // ==========================================
    // START FREE TRIAL
    // ==========================================

    async function startTrial() {

        console.log(
            "Start free trial clicked"
        );

        if (!shop) {

            alert(
                "Please connect your Shopify store first."
            );

            return;

        }

        if (trialButton) {

            trialButton.disabled = true;

            trialButton.innerText =
                "Opening Shopify Billing...";

        }

        try {

            window.location.href =
                `/billing/upgrade?shop=${encodeURIComponent(shop)}`;

        } catch (error) {

            console.error(
                "Billing error:",
                error
            );

            if (trialButton) {

                trialButton.disabled = false;

                trialButton.innerText =
                    "🚀 Start 7-Day Free Trial";

            }

            alert(
                "Unable to open Shopify Billing."
            );

        }

    }

    // ==========================================
    // RENDER FINDINGS
    // ==========================================

    function renderFindings(findings) {

        if (!resultsElement) {
            return;
        }

        if (
            !Array.isArray(findings) ||
            findings.length === 0
        ) {

            return;

        }

        const findingsHtml =
            findings.map((finding) => {

                if (
                    typeof finding === "string"
                ) {

                    return `

                        <div class="finding">

                            <strong>
                                ⚠️ Issue Found
                            </strong>

                            <p>
                                ${escapeHtml(finding)}
                            </p>

                        </div>

                    `;

                }

                const category =
                    finding.category ||
                    "General";

                const severity =
                    finding.severity ||
                    "info";

                const message =
                    finding.message ||
                    finding.description ||
                    finding.issue ||
                    finding.title ||
                    "Issue Found";

                return `

                    <div class="finding">

                        <strong>
                            ⚠️
                            ${escapeHtml(message)}
                        </strong>

                        <br>

                        <small>
                            Category:
                            ${escapeHtml(category)}
                        </small>

                        <br>

                        <small>
                            Severity:
                            ${escapeHtml(severity)}
                        </small>

                    </div>

                `;

            }).join("");

        resultsElement.innerHTML += `

            <div class="audit-section">

                <h3>
                    Issues Found
                </h3>

                ${findingsHtml}

            </div>

        `;

                    }

                              // ==========================================
    // RENDER RECOMMENDATIONS
    // ==========================================

    function renderRecommendations(recommendations) {

        if (!resultsElement) {
            return;
        }

        if (
            !Array.isArray(recommendations) ||
            recommendations.length === 0
        ) {
            return;
        }

        const recommendationsHtml =
            recommendations.map((recommendation) => {

                if (
                    typeof recommendation === "string"
                ) {

                    return `
                        <div class="recommendation">

                            <strong>
                                💡 Recommendation
                            </strong>

                            <p>
                                ${escapeHtml(
                                    recommendation
                                )}
                            </p>

                        </div>
                    `;

                }

                const title =
                    recommendation.title ||
                    recommendation.name ||
                    recommendation.recommendation ||
                    "Recommendation";

                const description =
                    recommendation.description ||
                    recommendation.message ||
                    recommendation.details ||
                    "";

                const priority =
                    recommendation.priority ||
                    "";

                const category =
                    recommendation.category ||
                    "";

                return `

                    <div class="recommendation">

                        <strong>
                            💡
                            ${escapeHtml(title)}
                        </strong>

                        ${
                            priority
                                ? `
                                    <br>

                                    <small>
                                        Priority:
                                        ${escapeHtml(
                                            priority
                                        )}
                                    </small>
                                  `
                                : ""
                        }

                        ${
                            category
                                ? `
                                    <br>

                                    <small>
                                        Category:
                                        ${escapeHtml(
                                            category
                                        )}
                                    </small>
                                  `
                                : ""
                        }

                        ${
                            description
                                ? `
                                    <p>
                                        ${escapeHtml(
                                            description
                                        )}
                                    </p>
                                  `
                                : ""
                        }

                    </div>

                `;

            }).join("");

        resultsElement.innerHTML += `

            <div class="audit-section">

                <h3>
                    Recommendations
                </h3>

                ${recommendationsHtml}

            </div>

        `;

    }

    // ==========================================
    // RENDER AUDIT RESULTS
    // ==========================================

    function renderAuditResults(data) {

        if (!resultsElement) {
            return;
        }

        resultsElement.innerHTML = "";

        if (!data) {

            resultsElement.innerHTML = `

                <div class="audit-section">

                    <h3>
                        Audit Results
                    </h3>

                    <p>
                        No audit results were returned.
                    </p>

                </div>

            `;

            return;

        }

        // ==========================================
        // AUDIT SCORE
        // ==========================================

        const score =
            data.score ??
            data.auditScore ??
            data.overallScore;

        if (
            score !== undefined &&
            score !== null
        ) {

            resultsElement.innerHTML += `

                <div class="audit-section">

                    <h2>
                        Audit Score:
                        ${escapeHtml(score)}/100
                    </h2>

                    ${
                        data.rating
                            ? `
                                <p>

                                    <strong>
                                        Rating:
                                    </strong>

                                    ${escapeHtml(
                                        data.rating
                                    )}

                                </p>
                              `
                            : ""
                    }

                </div>

            `;

        }

        // ==========================================
        // SUMMARY
        // ==========================================

        if (
            data.summary &&
            typeof data.summary === "object"
        ) {

            const summary =
                data.summary;

            resultsElement.innerHTML += `

                <div class="audit-section">

                    <h3>
                        Summary
                    </h3>

                    <p>

                        <strong>
                            Total Products:
                        </strong>

                        ${escapeHtml(
                            summary.totalProducts ?? 0
                        )}

                    </p>

                    <p>

                        <strong>
                            Products With Issues:
                        </strong>

                        ${escapeHtml(
                            summary.productsWithIssues ?? 0
                        )}

                    </p>

                    <p>

                        <strong>
                            Policies Found:
                        </strong>

                        ${escapeHtml(
                            summary.policiesFound ?? 0
                        )}

                    </p>

                    <p>

                        <strong>
                            Policies Missing:
                        </strong>

                        ${escapeHtml(
                            summary.policiesMissing ?? 0
                        )}

                    </p>

                    <p>

                        <strong>
                            Compliance Audit:
                        </strong>

                        ${
                            summary.complianceAuditAvailable
                                ? "Available"
                                : "Unavailable"
                        }

                    </p>

                </div>

            `;

        } else if (data.summary) {

            resultsElement.innerHTML += `

                <div class="audit-section">

                    <h3>
                        Summary
                    </h3>

                    <p>
                        ${escapeHtml(
                            data.summary
                        )}
                    </p>

                </div>

            `;

        }

        // ==========================================
        // FINDINGS
        // ==========================================

        renderFindings(
            data.findings ||
            data.issues ||
            []
        );

        // ==========================================
        // RECOMMENDATIONS
        // ==========================================

        renderRecommendations(
            data.recommendations ||
            data.recommendation ||
            []
        );

        // ==========================================
        // FALLBACK
        // ==========================================

        if (
            (!Array.isArray(data.findings) ||
                data.findings.length === 0) &&

            (!Array.isArray(data.issues) ||
                data.issues.length === 0) &&

            (!Array.isArray(data.recommendations) ||
                data.recommendations.length === 0) &&

            (!Array.isArray(data.recommendation) ||
                data.recommendation.length === 0) &&

            !data.summary &&

            score === undefined
        ) {

            resultsElement.innerHTML += `

                <div class="audit-section">

                    <h3>
                        Audit Results
                    </h3>

                    <pre>
${escapeHtml(
    JSON.stringify(data, null, 2)
)}
                    </pre>

                </div>

            `;

        }

    }

                              // ==========================================
    // RUN STORE AUDIT
    // ==========================================

    async function runStoreAudit() {

        console.log(
            "🔍 Run Store Audit clicked"
        );

        if (!shop) {

            alert(
                "Please connect your Shopify store first."
            );

            return;

        }

        if (auditButton) {

            auditButton.disabled = true;

            auditButton.innerText =
                "🔍 Running Audit...";

        }

        if (resultsElement) {

            resultsElement.innerHTML = `

                <div class="audit-section">

                    <h3>
                        Store Audit
                    </h3>

                    <p>
                        🔄 Analyzing your Shopify store...
                    </p>

                </div>

            `;

        }

        try {

            const response =
                await fetch(
                    `/api/audit?shop=${encodeURIComponent(shop)}`
                );

            if (!response.ok) {

                throw new Error(
                    `Audit request returned ${response.status}`
                );

            }

            const data =
                await response.json();

            console.log(
                "Audit results:",
                data
            );

            if (
                data.success === false
            ) {

                throw new Error(
                    data.error ||
                    "The audit could not be completed."
                );

            }

            renderAuditResults(data);

        } catch (error) {

            console.error(
                "Store audit error:",
                error
            );

            if (resultsElement) {

                resultsElement.innerHTML = `

                    <div class="audit-section">

                        <h3>
                            Audit Error
                        </h3>

                        <p>
                            ❌
                            ${escapeHtml(
                                error.message ||
                                "Unable to run the store audit."
                            )}
                        </p>

                    </div>

                `;

            }

        } finally {

            if (auditButton) {

                auditButton.disabled = false;

                auditButton.innerText =
                    "🔍 Run Store Audit";

            }

        }

    }

    // ==========================================
    // BUTTON EVENTS
    // ==========================================

    if (connectButton) {

        connectButton.addEventListener(
            "click",
            connectShopify
        );

    }

    if (trialButton) {

        trialButton.addEventListener(
            "click",
            startTrial
        );

    }

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            runStoreAudit
        );

    }

    // ==========================================
    // INITIALIZE DASHBOARD
    // ==========================================

    checkServerStatus();

    checkShopifyConnection();

    checkSubscription();

    console.log(
        "✅ Auditly Pro dashboard initialized"
    );

});
