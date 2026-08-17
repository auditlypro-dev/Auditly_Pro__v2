// ============================================================
// 🚀 AUDITLY PRO v2 - DASHBOARD.JS
// Shopify Store Audit + 7-Day Free Trial
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Auditly Pro dashboard.js loaded");

    // ============================================================
    // ELEMENTS
    // ============================================================

    const auditButton = document.getElementById("auditButton");

    // Find the trial button using several possible IDs,
    // then fall back to button text.
    function findTrialButton() {
        const possibleIds = [
            "startTrialButton",
            "start-trial-button",
            "trialButton",
            "startFreeTrialButton",
            "start-free-trial-button"
        ];

        for (const id of possibleIds) {
            const element = document.getElementById(id);

            if (element) {
                return element;
            }
        }

        const buttons = Array.from(document.querySelectorAll("button"));

        return buttons.find((button) => {
            const text = (button.textContent || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

            return (
                text.includes("start 7-day free trial") ||
                text.includes("start 7 day free trial") ||
                text.includes("start free trial") ||
                text.includes("7-day free trial") ||
                text.includes("7 day free trial")
            );
        }) || null;
    }

    const trialButton = findTrialButton();

    console.log("🔘 Audit button:", auditButton);
    console.log("💳 Trial button:", trialButton);

    // ============================================================
    // GET SHOPIFY SHOP DOMAIN
    // ============================================================

    function getShopDomain() {
        const selectors = [
            "[data-shop-domain]",
            "#shopDomain",
            "#shop-domain",
            ".shop-domain",
            "[data-shop]"
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                const value = (
                    element.dataset.shopDomain ||
                    element.dataset.shop ||
                    element.textContent ||
                    ""
                ).trim();

                const match = value.match(
                    /[a-zA-Z0-9-]+\.myshopify\.com/i
                );

                if (match) {
                    return match[0].toLowerCase();
                }
            }
        }

        // Search the visible page as a fallback.
        const pageText = document.body.innerText || "";

        const pageMatch = pageText.match(
            /[a-zA-Z0-9-]+\.myshopify\.com/i
        );

        if (pageMatch) {
            return pageMatch[0].toLowerCase();
        }

        // Last fallback: check the current URL.
        const currentUrl = window.location.href;

        const urlMatch = currentUrl.match(
            /[a-zA-Z0-9-]+\.myshopify\.com/i
        );

        if (urlMatch) {
            return urlMatch[0].toLowerCase();
        }

        return null;
    }

    // ============================================================
    // SHOW ERROR
    // ============================================================

    function showBillingError(message) {
        console.error("❌ BILLING ERROR:", message);

        alert(
            "Unable to start your 7-day free trial.\n\n" +
            message
        );
    }

    // ============================================================
    // START 7-DAY FREE TRIAL
    // ============================================================

    async function startFreeTrial(button) {
        if (!button) {
            console.error(
                "❌ Start Free Trial button was not found."
            );

            return;
        }

        if (button.dataset.billingProcessing === "true") {
            console.log(
                "⚠️ Billing request already in progress."
            );

            return;
        }

        const originalText = button.textContent;

        button.dataset.billingProcessing = "true";
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = "⏳ Starting Free Trial...";

        try {
            console.log(
                "💳 ========================================"
            );

            console.log(
                "💳 AUDITLY PRO FREE TRIAL START"
            );

            console.log(
                "💳 ========================================"
            );

            // ----------------------------------------------------
            // FIND CONNECTED SHOP
            // ----------------------------------------------------

            const shop = getShopDomain();

            console.log(
                "🏪 Connected Shopify store:",
                shop
            );

            if (!shop) {
                throw new Error(
                    "Auditly Pro could not determine your connected Shopify store. Please connect your Shopify store first."
                );
            }

            // ----------------------------------------------------
            // CALL AUDITLY PRO BILLING ROUTE
            // ----------------------------------------------------

            const billingUrl =
                "/billing/upgrade?shop=" +
                encodeURIComponent(shop);

            console.log(
                "💳 Sending billing request to:",
                billingUrl
            );

            const response = await fetch(billingUrl, {
                method: "POST",

                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },

                credentials: "include",

                cache: "no-store",

                body: JSON.stringify({
                    shop: shop
                })
            });

            console.log(
                "💳 Billing HTTP status:",
                response.status
            );

            // ----------------------------------------------------
            // READ RESPONSE
            // ----------------------------------------------------

            const responseText = await response.text();

            console.log(
                "💳 Raw billing response:",
                responseText
            );

            let data;

            try {
                data = responseText
                    ? JSON.parse(responseText)
                    : {};
            } catch (parseError) {
                throw new Error(
                    "Auditly Pro received an invalid response from the billing server."
                );
            }

            console.log(
                "💳 Parsed billing response:",
                data
            );

            // ----------------------------------------------------
            // HTTP ERROR
            // ----------------------------------------------------

            if (!response.ok) {
                let serverMessage =
                    data.error ||
                    data.message ||
                    data.details;

                if (Array.isArray(serverMessage)) {
                    serverMessage = serverMessage
                        .map((item) => {
                            if (typeof item === "string") {
                                return item;
                            }

                            return (
                                item.message ||
                                JSON.stringify(item)
                            );
                        })
                        .join("\n");
                }

                throw new Error(
                    serverMessage ||
                    `Billing request failed with HTTP ${response.status}.`
                );
            }

            // ----------------------------------------------------
            // ALREADY SUBSCRIBED
            // ----------------------------------------------------

            if (
                data.alreadySubscribed === true ||
                data.active === true ||
                data.subscribed === true ||
                data.subscriptionStatus === "ACTIVE"
            ) {
                console.log(
                    "✅ Auditly Pro subscription is already active."
                );

                alert(
                    "Your Auditly Pro subscription is already active."
                );

                window.location.reload();

                return;
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
                    "✅ Shopify billing confirmation URL received."
                );

                console.log(
                    "➡️ Redirecting merchant to Shopify..."
                );

                // Shopify returns the approval URL.
                // Send the merchant directly there.
                window.location.assign(
                    confirmationUrl
                );

                return;
            }

            // ----------------------------------------------------
            // NO CONFIRMATION URL
            // ----------------------------------------------------

            throw new Error(
                data.error ||
                data.message ||
                "Shopify did not return a billing confirmation URL."
            );

        } catch (error) {
            console.error(
                "❌ Failed to start Auditly Pro trial:",
                error
            );

            showBillingError(
                error.message ||
                "An unexpected billing error occurred."
            );

            // Allow the user to try again.
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.dataset.billingProcessing = "false";
            button.textContent = originalText;
        }
    }

    // ============================================================
    // TRIAL BUTTON
    // ============================================================

    if (trialButton) {
        console.log(
            "✅ Trial button found and billing handler attached."
        );

        trialButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                startFreeTrial(trialButton);
            }
        );

    } else {
        console.error(
            "❌ CRITICAL: Start 7-Day Free Trial button was not found."
        );

        console.error(
            "Available buttons:",
            Array.from(
                document.querySelectorAll("button")
            ).map((button) => ({
                id: button.id,
                text: button.textContent
            }))
        );
    }

    // ============================================================
    // STORE AUDIT
    // ============================================================

    if (auditButton) {
        auditButton.addEventListener(
            "click",
            async (event) => {
                event.preventDefault();

                const originalText =
                    auditButton.textContent;

                auditButton.disabled = true;

                auditButton.textContent =
                    "⏳ Running Audit...";

                try {
                    console.log(
                        "🔍 Starting Shopify store audit..."
                    );

                    const response = await fetch(
                        "/api/audit",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            credentials: "include",

                            cache: "no-store"
                        }
                    );

                    const data =
                        await response.json();

                    console.log(
                        "🔍 Audit response:",
                        data
                    );

                    if (!response.ok) {
                        throw new Error(
                            data.error ||
                            data.message ||
                            "Store audit failed."
                        );
                    }

                    console.log(
                        "✅ Store audit completed."
                    );

                    window.location.reload();

                } catch (error) {
                    console.error(
                        "❌ Store audit failed:",
                        error
                    );

                    alert(
                        "Unable to run the store audit.\n\n" +
                        (
                            error.message ||
                            "Unknown error."
                        )
                    );

                    auditButton.disabled = false;

                    auditButton.textContent =
                        originalText;
                }
            }
        );
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    console.log(
        "✅ Auditly Pro dashboard initialized."
    );

    console.log(
        "💳 Shopify billing integration ready."
    );
});
