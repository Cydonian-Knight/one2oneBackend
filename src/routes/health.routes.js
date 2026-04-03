const express = require('express');
const router = express.Router();

const { healthCheck, errorCheck, middleCheck } = require('../controllers/health.controller');

router.get('/health', healthCheck);
router.get('/error', errorCheck);
router.get('/middle', middleCheck);

module.exports = router;


