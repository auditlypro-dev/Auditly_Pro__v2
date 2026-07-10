// ==========================================
// Auditly Pro v2 Dashboard JavaScript
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("startAudit");

    if (button) {

        button.addEventListener("click", async () => {

            try {

                const response = await fetch("/api/audit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });


                const data = await response.json();


                alert(
                    data.message || "Audit started!"
                );


            } catch (error) {

                console.error(error);

                alert("Unable to start audit.");

            }

        });

    }

});
