const express = require('express');
const router = express.Router();

// Logica para el manejo de archivos desde FormData
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { initialMessages, newMessage } = require('../controllers/message.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);
router.get('/:conversationId/initial', initialMessages);
router.post('/:conversationId/newMessage', upload.single('content'), newMessage);

module.exports = router;


