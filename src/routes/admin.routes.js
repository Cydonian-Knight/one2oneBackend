const express = require('express');
const router = express.Router();

const auth = require('../middlewares/admin.middleware');
const { success } = require('../utils/response');
const { getHistory, streamMetrics,
    getDashboardStats, getProviderMetrics,
    getServerStats, getReports, resolveReport, dismissReport,
    getCallLogs, getUsers, reactivateUser
} = require('../controllers/admin.controller');

router.get('/me', auth, (req, res) => {
    return success(res);
});


router.get('/metrics/history', auth, getHistory);
router.get('/metrics/stream', auth, streamMetrics);
router.get('/stats', auth, getDashboardStats);
router.get('/provider-metrics', auth, getProviderMetrics);
router.get('/metrics/history24', auth, getServerStats);
router.get('/reports', auth, getReports);
router.post('/reports/:id/resolve', auth, resolveReport);
router.post('/reports/:id/dismiss', auth, dismissReport);
router.get('/call-logs', auth, getCallLogs);
router.get('/users', auth, getUsers);
router.post('/users/:id/reactivate', auth, reactivateUser);

module.exports = router;


