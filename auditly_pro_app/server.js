// ==========================================
// Auditly Pro v2 - Main Server
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const apiRoutes = require("./routes/api");
const billingRoutes = require("./routes/billing");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// Routes

app.use("/auth", authRoutes);

app.use("/dashboard", dashboardRoutes);

app.use("/api", apiRoutes);

app.use("/billing", billingRoutes);


// Health check

app.get("/", (req, res) => {

    res.send(`
        <h1>🚀 Auditly Pro v2 Running</h1>
        <p>AI-Powered Shopify Compliance & Optimization Platform</p>
        <p>Status: Online</p>
    `);

});


// Start server
console.log("===== REGISTERED ROUTES =====");

app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        console.log(
            Object.keys(middleware.route.methods).join(",").toUpperCase(),
            middleware.route.path
        );
    } else if (middleware.name === "router") {
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                console.log(
                    Object.keys(handler.route.methods).join(",").toUpperCase(),
                    handler.route.path
                );
            }
        });
    }
});

console.log("=============================");
app.listen(PORT, () => {

    console.log("--------------------------------");
    console.log("🚀 Auditly Pro v2 Server Started");
    console.log("Port:", PORT);
    console.log("--------------------------------");

});
