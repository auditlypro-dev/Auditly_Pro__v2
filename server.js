const express = require("express");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Auditly Pro server is running 🚀");
});

// Health check route (important for Render/hosting)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Auditly Pro running on port ${PORT}`);
});
