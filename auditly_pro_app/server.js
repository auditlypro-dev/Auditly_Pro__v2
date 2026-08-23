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

// ==========================================
// Middleware
// ==========================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// ==========================================
// Auditly Pro App Home
// GET /
// ==========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "views/dashboard.html"
        )
    );

});


// ==========================================
// Routes
// ==========================================

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api", apiRoutes);
app.use("/billing", billingRoutes);



// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("🚀 Auditly Pro v2 Server Started");
    console.log("Port:", PORT);
    console.log("--------------------------------");
});
