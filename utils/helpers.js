// ==========================================
// Auditly Pro v2
// Utility Helpers
// ==========================================

function formatDate(date) {

    return new Date(date).toLocaleDateString();

}

function generateAuditId() {

    return "AUDIT-" +

        Date.now() +

        "-" +

        Math.floor(Math.random() * 1000);

}

function successResponse(message, data = {}) {

    return {

        success: true,

        message,

        data

    };

}

function errorResponse(message) {

    return {

        success: false,

        message

    };

}

module.exports = {

    formatDate,

    generateAuditId,

    successResponse,

    errorResponse

};
