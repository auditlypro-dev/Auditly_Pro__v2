// ============================================================
// AUDITLY PRO v2 - DASHBOARD.JS
// Shopify Trial + Store Audit
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Auditly Pro dashboard.js loaded");

    // ==========================================================
    // FIND TRIAL BUTTON
    // ==========================================================

    function findTrialButton() {

        const ids = [
            "startTrialButton",
            "start-trial-button",
            "trialButton",
            "startFreeTrialButton",
            "start-free-trial-button"
        ];

        for (const id of ids) {

            const button =
                document.getElementById(id);

            if (button) {
                return button;
            }

        }

        const buttons =
            Array.from(
                document.querySelectorAll("button")
            );

        return buttons.find(button => {

            const text =
                (button.textContent || "")
                    .trim()
                    .toLowerCase();

            return (
                text.includes("start 7-day free trial") ||
                text.includes("start 7 day free trial") ||
                text.includes("start free trial")
            );

        }) || null;

    }

    const trialButton =
        findTrialButton();

    console.log(
        "💳 Trial button:",
        trialButton
    );

    // ==========================================================
    // GET CONNECTED SHOP FROM SERVER
    // ==========================================================

    async function getConnectedShop() {

        console.log(
            "🏪 Requesting connected Shopify store..."
        );

        const response =
            await fetch(
                "/dashboard/shop",
                {
                    method: "GET",

                    headers: {
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
            "🏪 Shop response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.error ||
                "No connected Shopify store was found."
            );

        }

        if (!data.shop) {

            throw new Error(
                "Auditly Pro could not determine your connected Shopify store."
            );

        }

        return data.shop;

    }

    // ==========================================================
    // START FREE TRIAL
    // ==========================================================

    async function startFreeTrial() {

        if (!trialButton) {

            console.error(
                "❌ Trial button not found."
            );

            return;

        }

        if (
            trialButton.dataset.processing ===
            "true"
        ) {

            return;

        }

        const originalText =
            trialButton.textContent;

        trialButton.dataset.processing =
            "true";

        trialButton.disabled =
            true;

        trialButton.textContent =
            "⏳ Starting Free Trial...";

        try {

            // --------------------------------------------------
            // GET CONNECTED SHOP
            // --------------------------------------------------

            const shop =
                await getConnectedShop();

            console.log(
                "✅ Connected Shopify shop:",
                shop
            );

            // --------------------------------------------------
            // START SHOPIFY BILLING
            // --------------------------------------------------

            const billingUrl =
                "/billing/upgrade?shop=" +
                encodeURIComponent(shop);

            console.log(
                "💳 Starting Shopify billing:"
            );

            console.log(
                billingUrl
            );

            const response =
                await fetch(
                    billingUrl,
                    {
                        method: "POST",

                        headers: {
                            "Accept":
                                "application/json",

                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        cache: "no-store",

                        body: JSON.stringify({
                            shop: shop
                        })
                    }
                );

            const text =
                await response.text();

            console.log(
                "💳 Billing response:",
                text
            );

            let data;

            try {

                data =
                    JSON.parse(text);

            } catch {

                throw new Error(
                    "Invalid response received from the billing server."
                );

            }

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    data.details ||
                    `Billing request failed (${response.status}).`
                );

            }

            // --------------------------------------------------
            // SHOPIFY APPROVAL URL
            // --------------------------------------------------

            const confirmationUrl =
                data.confirmationUrl ||
                data.confirmation_url ||
                data.url;

            if (!confirmationUrl) {

                throw new Error(
                    "Shopify did not return a subscription approval URL."
                );

            }

            console.log(
                "✅ Shopify approval URL received."
            );

            console.log(
                "➡️ Redirecting to Shopify..."
            );

            window.location.href =
                confirmationUrl;

        } catch (error) {

            console.error(
                "❌ FREE TRIAL ERROR:",
                error
            );

            alert(
                "Unable to start your 7 day free trial.\n\n" +
                error.message
            );

            trialButton.disabled =
                false;

            trialButton.dataset.processing =
                "false";

            trialButton.textContent =
                originalText;

        }

    }

    // ==========================================================
    // ATTACH TRIAL BUTTON
    // ==========================================================

    if (trialButton) {

        trialButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                startFreeTrial();

            }
        );

        console.log(
            "✅ Free trial click handler attached."
        );

    }

    // ==========================================================
    // STORE AUDIT
    // ==========================================================

    const auditButton =
        document.getElementById(
            "auditButton"
        );

    if (auditButton) {

        auditButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();

                const originalText =
                    auditButton.textContent;

                auditButton.disabled =
                    true;

                auditButton.textContent =
                    "⏳ Running Audit...";

                try {

                    const response =
                        await fetch(
                            "/api/audit",
                            {
                                method: "POST",

                                headers: {
                                    "Accept":
                                        "application/json",

                                    "Content-Type":
                                        "application/json"
                                },

                                credentials:
                                    "include",

                                cache:
                                    "no-store"
                            }
                        );

                    const data =
                        await response.json();

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
                        error.message
                    );

                    auditButton.disabled =
                        false;

                    auditButton.textContent =
                        originalText;

                }

            }
        );

    }

    console.log(
        "✅ Auditly Pro dashboard initialized."
    );

});
