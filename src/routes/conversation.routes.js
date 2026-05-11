const express = require('express');
const router = express.Router();

const { allConversations, newConversation, markAsRead, markAsDelivered } = require('../controllers/conversation.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);

router.get('/allConversations', allConversations);
router.post('/newConversation', newConversation);
router.patch('/:conversationId/read', markAsRead);
router.patch('/:conversationId/delivered', markAsDelivered);

module.exports = router;


