const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const conversationRoutes = require('./conversation.routes')
const userRoutes = require('./user.routes')
const messageRoutes = require('./message.routes')

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/conversation', conversationRoutes)
router.use('/user', userRoutes)
router.use('/msg', messageRoutes)

module.exports = router;


