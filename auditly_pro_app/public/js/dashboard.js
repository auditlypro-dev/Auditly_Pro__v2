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
    // Run Store Audit
    // ==========================================

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async () => {

                resultsElement.innerHTML = `

                    🔄
                    <strong>
                        Starting store audit...
                    </strong>

                    <br><br>

                    Auditly Pro is connecting to
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

                    if (
                        response.ok &&
                        data.success
                    ) {

                        resultsElement.innerHTML = `

                            🟢
                            <strong>
                                Audit started successfully.
                            </strong>

                            <br><br>

                            ${escapeHtml(
                                data.message ||
                                "Audit is running."
                            )}

                        `;

                    } else {

                        resultsElement.innerHTML = `

                            🔴
                            <strong>
                                Audit could not be started.
                            </strong>

                            <br><br>

                            ${escapeHtml(
                                data.error ||
                                data.message ||
                                "Unknown error."
                            )}

                        `;

                    }

                } catch (error) {

                    console.error(
                        "Audit request failed:",
                        error
                    );

                    resultsElement.innerHTML = `

                        🔴
                        <strong>
                            Unable to start audit.
                        </strong>

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
