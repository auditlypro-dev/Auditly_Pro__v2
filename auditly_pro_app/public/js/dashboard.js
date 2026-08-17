// ============================================================
// 🚀 AUDITLY PRO v2 - DASHBOARD.JS
// Shopify Subscription + Store Audit
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Auditly Pro dashboard.js loaded");

    // ------------------------------------------------------------
    // ELEMENTS
    // ------------------------------------------------------------

    const auditButton = document.getElementById("auditButton");

    // Find the 7-day trial button even if its exact ID changes.
    const trialButton =
        document.getElementById("startTrialButton") ||
        document.getElementById("start-trial-button") ||
        document.getElementById("trialButton") ||
        Array.from(document.querySelectorAll("button")).find(button =>
            button.textContent
                .toLowerCase()
                .includes("start 7-day free trial")
        ) ||
        Array.from(document.querySelectorAll("button")).find(button =>
            button.textContent
                .toLowerCase()
                .includes("start 7 day free trial")
        );

    console.log("Audit button:", auditButton);
    console.log("Trial button:", trialButton);

    // ------------------------------------------------------------
    // SHOPIFY STORE
    // ------------------------------------------------------------

    function getShopDomain() {
        // Try common dashboard elements first.
        const selectors = [
            "[data-shop-domain]",
            "#shopDomain",
            "#shop-domain",
            ".shop-domain"
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);

            if (element) {
                const value =
                    element.dataset.shopDomain ||
                    element.textContent.trim();

                if (value && value.includes(".myshopify.com")) {
                    return value;
                }
            }
        }

        // Search visible page text as a fallback.
        const pageText = document.body.innerText || "";

        const match = pageText.match(
            /[a-zA-Z0-9-]+\.myshopify\.com/
        );

        if (match) {
            return match[0];
        }

        return null;
    }

    // ------------------------------------------------------------
    // START 7-DAY FREE TRIAL
    // ------------------------------------------------------------

    async function startFreeTrial() {
        if (!trialButton) {
            console.error("❌ Trial button was not found.");
            return;
        }

        const originalText = trialButton.textContent;

        trialButton.disabled = true;
        trialButton.textContent = "⏳ Starting Free Trial...";

        try {
            const shop = getShopDomain();

            console.log("🏪 Shopify shop:", shop);

            if (!shop) {
                throw new Error(
                    "Unable to determine the connected Shopify store."
                );
            }

            console.log("💳 Creating Shopify subscription...");

            const response = await fetch("/billing/upgrade", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    shop: shop
                })
            });

            console.log(
                "💳 Billing response status:",
                response.status
            );

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                console.warn(
                    "Billing response was not JSON."
                );
            }

            console.log("💳 Billing response:", data);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    data.details ||
                    `Billing request failed (${response.status})`
                );
            }

            // ----------------------------------------------------
            // SHOPIFY CONFIRMATION URL
            // ----------------------------------------------------

            const confirmationUrl =
                data.confirmationUrl ||
                data.confirmation_url ||
                data.confirmationURL ||
                data.url;

            if (confirmationUrl) {
                console.log(
                    "✅ Shopify confirmation URL received."
                );

                // Send merchant to Shopify's subscription approval page.
                window.location.href = confirmationUrl;
                return;
            }

            // ----------------------------------------------------
            // ALREADY SUBSCRIBED
            // ----------------------------------------------------

            if (
                data.active === true ||
                data.subscribed === true ||
                data.subscriptionStatus === "ACTIVE"
            ) {
                alert(
                    "Your Auditly Pro subscription is already active."
                );

                window.location.reload();
                return;
            }

            // ----------------------------------------------------
            // SERVER ERROR WITHOUT HTTP ERROR
            // ----------------------------------------------------

            throw new Error(
                data.error ||
                data.message ||
                "Shopify did not return a subscription confirmation URL."
            );

        } catch (error) {
            console.error(
                "❌ Failed to start Auditly Pro trial:",
                error
            );

            alert(
                "Unable to start your 7-day free trial.\n\n" +
                error.message
            );

            trialButton.disabled = false;
            trialButton.textContent = originalText;
        }
    }

    // ------------------------------------------------------------
    // TRIAL BUTTON CLICK
    // ------------------------------------------------------------

    if (trialButton) {
        trialButton.addEventListener(
            "click",
            startFreeTrial
        );
    } else {
        console.warn(
            "⚠️ Start 7-Day Free Trial button not found."
        );
    }

    // ------------------------------------------------------------
    // STORE AUDIT
    // ------------------------------------------------------------

    if (auditButton) {
        auditButton.addEventListener("click", async () => {
            const originalText = auditButton.textContent;

            auditButton.disabled = true;
            auditButton.textContent = "⏳ Running Audit...";

            try {
                console.log("🔍 Starting Shopify store audit...");

                const response = await fetch("/api/audit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    credentials: "include"
                });

                const data = await response.json();

                console.log("🔍 Audit response:", data);

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        data.message ||
                        "Store audit failed."
                    );
                }

                // Reload dashboard so the audit results appear.
                window.location.reload();

            } catch (error) {
                console.error(
                    "❌ Store audit failed:",
                    error
                );

                alert(
                    "Unable to run the store audit.\n\n" +
                    error.message
                );

                auditButton.disabled = false;
                auditButton.textContent = originalText;
            }
        });
    }

    // ------------------------------------------------------------
    // INITIALIZATION COMPLETE
    // ------------------------------------------------------------

    console.log(
        "✅ Auditly Pro dashboard initialized successfully."
    );
});
