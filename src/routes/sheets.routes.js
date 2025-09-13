const express = require('express');
const { sheetsProxy } = require('../controllers/sheets.controller');

const router = express.Router();

router.post('/sheets-proxy', sheetsProxy);

module.exports = router;