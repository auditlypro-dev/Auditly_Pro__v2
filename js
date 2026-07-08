async function checkStatus() {

    try {

        const response = await fetch("/dashboard/status");

        const data = await response.json();

        document.getElementById("status").innerHTML = `

            <strong>${data.status}</strong><br>

            Version: ${data.version}

        `;

    } catch (error) {

        document.getElementById("status").innerHTML =

            "Unable to connect to server.";

    }

}

document.getElementById("auditButton").addEventListener("click", async () => {

    document.getElementById("results").innerHTML =

        "Running demo audit...";

    try {

        const response = await fetch("/api/audit", {

            method: "POST"

        });

        const data = await response.json();

        document.getElementById("results").innerHTML = `

            ✅ ${data.message}

        `;

    } catch (error) {

        document.getElementById("results").innerHTML =

            "Audit failed.";

    }

});

checkStatus();