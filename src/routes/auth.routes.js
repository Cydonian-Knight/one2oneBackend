const express = require('express');
const router = express.Router();

const { register, login, sendVerificationCode, verifyCode, updateEmail, logout } = require('../controllers/auth.controller');
const temporalAuth = require('../middlewares/temporalAuth.middleware');
const rateLimit = require('../middlewares/ratelimit.middlware');
const auth = require('../middlewares/auth.middleware');
const { success } = require('../utils/response');

router.get('/me', auth, (req, res) => {
    return success(res);
});


router.post('/register', /* rateLimit.tresSolicitudesLimit, */ register);
router.post('/login', login);
router.post('/sendVerificationCode', /* rateLimit.tresSolicitudesLimit ,*/ temporalAuth, sendVerificationCode)
router.post('/updateEmail', temporalAuth, updateEmail)
router.post('/verifyCode', temporalAuth, verifyCode)
router.post('/logout', auth, logout);


module.exports = router;


