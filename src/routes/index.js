const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const appRoutes = require('./app.routes')

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/app', appRoutes)

module.exports = router;


