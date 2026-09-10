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
    // SHOW MISSING SHOP
    // ==========================================

    function showMissingShop() {

        console.warn(
            "⚠️ No valid Shopify shop parameter was provided."
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

                Please open Auditly Pro from
                your Shopify Admin.

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

        if (upgradeButton) {
            upgradeButton.disabled = true;
        }

        if (auditButton) {
            auditButton.disabled = true;
        }

    }

    // ==========================================
    // CHECK SERVER
    // ==========================================

    async function checkServer() {

        if (!statusElement) {
            return;
        }

        statusElement.innerHTML =
            "🔄 Checking server...";

        try {

            const response =
                await fetch("/dashboard/health");

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

                statusElement.innerHTML =
                    "🟢 <strong>Online</strong>";

                return;

            }

            statusElement.innerHTML =
                "🟡 Server responded, but status is unknown.";

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
                "🔎 Checking connected Shopify store:",
                shop
            );

            const response =
                await fetch(apiUrl);

            const data =
                await response.json();

            console.log(
                "🏪 Shopify connection response:",
                data
            );

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

                if (auditButton) {
                    auditButton.disabled = false;
                }

                console.log(
                    "✅ Connected merchant store:",
                    storeDomain
                );

                return;

            }

            if (response.status === 404) {

                console.warn(
                    "⚠️ Store was not found in Supabase:",
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

                if (auditButton) {
                    auditButton.disabled = true;
                }

                return;

            }

            console.error(
                "❌ Shopify store verification failed:",
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

            if (auditButton) {
                auditButton.disabled = true;
            }

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

            if (auditButton) {
                auditButton.disabled = true;
            }

        }

    }

    // ==========================================
    // CHECK BILLING STATUS
    // ==========================================

    async function checkBillingStatus() {

        if (!billingStatusElement) {
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
                data.success === true
            ) {

                if (data.active) {

                    billingStatusElement.innerHTML = `

                        🟢
                        <strong>
                            Auditly Pro Subscription Active
                        </strong>

                    `;

                    if (upgradeButton) {

                        upgradeButton.disabled = true;

                        upgradeButton.innerHTML =
                            "✅ Auditly Pro Active";

                    }

                    if (billingMessageElement) {
                        billingMessageElement.innerHTML = "";
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

    }    // ==========================================
    // START 7-DAY FREE TRIAL
    // ==========================================

    if (upgradeButton) {

        upgradeButton.addEventListener(
            "click",
            () => {

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

                                Please open Auditly Pro from
                                your Shopify Admin.

                            </div>

                        `;

                    }

                    return;

                }

                upgradeButton.disabled = true;

                upgradeButton.innerHTML =
                    "🔄 Opening Shopify Billing...";

                if (billingMessageElement) {

                    billingMessageElement.innerHTML = `

                        <div>

                            🔄
                            <strong>
                                Opening Shopify billing...
                            </strong>

                            <br><br>

                            You will be taken to Shopify to
                            start your 7-day free trial.

                        </div>

                    `;

                }

                console.log(
                    "➡️ Opening Auditly Pro Shopify pricing:",
                    shop
                );

                const billingUrl =
                    `/billing/upgrade?shop=${encodeURIComponent(shop)}`;

                // Auditly Pro runs inside Shopify's
                // embedded app frame.
                //
                // Use top-level navigation so Shopify's
                // hosted pricing page opens correctly.

                if (window.top !== window.self) {

                    window.top.location.href =
                        billingUrl;

                } else {

                    window.location.href =
                        billingUrl;

                }

            }
        );

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
                            ⚠️
                            ${escapeHtml(finding)}
                        </div>
                    `;

                }

                const title =
                    finding.title ||
                    finding.issue ||
                    finding.name ||
                    "Issue Found";

                const description =
                    finding.description ||
                    finding.message ||
                    finding.details ||
                    "";

                const severity =
                    finding.severity ||
                    finding.priority ||
                    "";

                return `

                    <div class="finding">

                        <strong>
                            ⚠️
                            ${escapeHtml(title)}
                        </strong>

                        ${
                            severity
                                ? `
                                    <br>
                                    <small>
                                        ${escapeHtml(severity)}
                                    </small>
                                  `
                                : ""
                        }

                        ${
                            description
                                ? `
                                    <br><br>
                                    ${escapeHtml(description)}
                                  `
                                : ""
                        }

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

    if (score !== undefined && score !== null) {

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
                                ${escapeHtml(data.rating)}
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

    } else if (
        data.summary
    ) {

        resultsElement.innerHTML += `

            <div class="audit-section">

                <h3>
                    Summary
                </h3>

                <p>
                    ${escapeHtml(data.summary)}
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
${escapeHtml(JSON.stringify(data, null, 2))}
                </pre>

            </div>

        `;

    }

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

    if (score !== undefined && score !== null) {

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
                                ${escapeHtml(data.rating)}
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

    } else if (
        data.summary
    ) {

        resultsElement.innerHTML += `

            <div class="audit-section">

                <h3>
                    Summary
                </h3>

                <p>
                    ${escapeHtml(data.summary)}
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
${escapeHtml(JSON.stringify(data, null, 2))}
                </pre>

            </div>

        `;

    }

}
    }

    // ==========================================
    // RUN STORE AUDIT
    // ==========================================

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async () => {

                if (!hasValidShop()) {

                    console.error(
                        "❌ Cannot run audit: no valid Shopify shop."
                    );

                    return;

                }

                auditButton.disabled = true;

                auditButton.innerHTML =
                    "🔄 Running Audit...";

                if (resultsElement) {

                    resultsElement.innerHTML = `

                        <div class="audit-section">

                            <h3>
                                🔄 Running Audit...
                            </h3>

                            <p>
                                Auditly Pro is checking your
                                Shopify store.
                            </p>

                        </div>

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
                                },
                                body: JSON.stringify({
                                    shop: shop
                                })
                            }
                        );

                    const data =
                        await response.json();

                    console.log(
                        "📊 Audit response:",
                        data
                    );

                    if (
                        !response.ok ||
                        data.success === false
                    ) {

                        throw new Error(
                            data.error ||
                            data.message ||
                            data.details ||
                            "Audit failed."
                        );

                    }

                    renderAuditResults(
                        data
                    );

                } catch (error) {

                    console.error(
                        "❌ Audit request failed:",
                        error
                    );

                    if (resultsElement) {

                        resultsElement.innerHTML = `

                            <div class="audit-section">

                                🔴
                                <strong>
                                    Audit could not be completed.
                                </strong>

                                <br><br>

                                ${escapeHtml(
                                    error.message ||
                                    "Unknown audit error."
                                )}

                            </div>

                        `;

                    }

                } finally {

                    auditButton.disabled = false;

                    auditButton.innerHTML =
                        "🔍 Run Store Audit";

                }

            }
        );

    }

    // ==========================================
    // CONNECT SHOP LISTENER
    // ==========================================

    const connectShop =
        document.getElementById("connectShop");

    if (connectShop) {

        connectShop.addEventListener(
            "click",
            () => {

                console.log(
                    "🔗 Connect Shopify clicked"
                );

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
