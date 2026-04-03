const express = require('express');
const router = express.Router();

const { register, login, sendVerificationCode, verifyCode, updateEmail } = require('../controllers/auth.controller');
const temporalAuth = require('../middlewares/temporalAuth.middleware')

router.post('/register', register);
router.post('/login', login);
router.post('/sendVerificationCode', temporalAuth, sendVerificationCode)
router.post('/updateEmail', temporalAuth, updateEmail)
router.post('/verifyCode', temporalAuth, verifyCode)

module.exports = router;


