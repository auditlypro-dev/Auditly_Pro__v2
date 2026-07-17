const express = require("express");
const router = express.Router();



// ==========================================
// Auditly Pro v2
// API Routes
// ==========================================


// Test API

router.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Auditly Pro API"
    });

});




// ==========================================
// Audit Results
// ==========================================

router.get("/results", (req, res) => {

    res.json({

        success: true,

        results: []

    });

});


module.exports = router;
