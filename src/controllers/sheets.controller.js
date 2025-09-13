const standardErrorResponse = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
};

const sheetsProxy = async (req, res) => {
    try {
        if (!process.env.GOOGLE_SCRIPT_URL) {
            console.error("GOOGLE_SCRIPT_URL not configured");
            return res.status(500).json({ error: "Sheets integration not configured" });
        }
        const payload = { ...req.body, secret: process.env.GAS_SECRET };
        const gasResponse = await fetch(process.env.GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const responseData = await gasResponse.json();
        res.status(gasResponse.status).json(responseData);
    } catch (error) {
        return standardErrorResponse(res, error, "sheets proxy");
    }
};

module.exports = { sheetsProxy };