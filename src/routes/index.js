const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const conversationRoutes = require('./conversation.routes')

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/conversation', conversationRoutes)

module.exports = router;


