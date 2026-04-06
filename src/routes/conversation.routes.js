const express = require('express');
const router = express.Router();

const { allConversations } = require('../controllers/conversation.controller');
const auth = require('../middlewares/auth.middleware');


router.get('/allConversations', auth, allConversations);

module.exports = router;


