const { getDb } = require('../utils/db');

const standardErrorResponse = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
};

const getPageContent = async (req, res) => {
    try {
        const db = await getDb();
        const pageContent = await db.collection("cmsPages").findOne({ key: req.params.pageKey });
        if (pageContent) {
            res.json(pageContent);
        } else {
            res.status(404).json({ message: "Page content not found." });
        }
    } catch (error) {
        return standardErrorResponse(res, error, "fetching page content");
    }
};

const updatePageContent = async (req, res) => {
    try {
        const db = await getDb();
        const { pageKey } = req.params;
        const updatedContent = req.body;
        if (!updatedContent || !updatedContent.title || !updatedContent.content) {
            return res.status(400).json({ message: "Invalid update data." });
        }
        const result = await db.collection("cmsPages").updateOne({ key: pageKey }, { $set: { title: updatedContent.title, content: updatedContent.content } }, { upsert: true });
        res.json({ message: "Page content updated successfully." });
    } catch (error) {
        return standardErrorResponse(res, error, "updating CMS page content");
    }
};

module.exports = {
    getPageContent,
    updatePageContent
};