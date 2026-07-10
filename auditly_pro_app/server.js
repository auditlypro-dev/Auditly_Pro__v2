// ==========================================
// Auditly Pro v2
// AI-Powered Shopify Compliance & Optimization Platform
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();


// ==========================================
// Middleware
// ==========================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ 
    extended: true 
}));


// ==========================================
// Static Files
// ==========================================

app.use(express.static(path.join(__dirname, "public")));


// ==========================================
// Routes
// ==========================================

const billingRoutes = require("./routes/billing");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
app.use("/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/dashboard", dashboardRoutes);

app.use("/api", apiRoutes);

app.use("/billing", billingRoutes);


// ==========================================
// Main Health Check
// ==========================================

app.get("/", (req, res) => {

    res.send(`

        <h1>🚀 Auditly Pro v2</h1>

        <p>
        AI-Powered Shopify Compliance & Optimization Platform
        </p>

        <p>
        Server Status: Online
        </p>

    `);

});


// ==========================================
// 404 Handler
// ==========================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Route not found."

    });

});


// ==========================================
// Render Port Configuration
// ==========================================

const PORT = process.env.PORT || 10000;


app.listen(PORT, () => {

    console.log(`🚀 Auditly Pro v2 running on port ${PORT}`);

});
