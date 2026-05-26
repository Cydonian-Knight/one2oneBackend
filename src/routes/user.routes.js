const express = require('express');
const rateLimit = require('../middlewares/ratelimit.middlware');

// Logica para el manejo de archivos desde FormData
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const router = express.Router();

const { header, info, newAvatar, newInfo, searchUsers, newPass } = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');

// Uso de .use(auth) para que cualquier ruta a partir de aqui este protegida por el middleware
router.use(auth);


router.get('/header', header);
router.get('/info', info);
router.post('/search', searchUsers);

// Uso de .use(rateLimit.unaSolicitudLimit) para que cualquier ruta a partir de aqui solo pueda solicitarse una vez cada 1 hora
/* router.use(rateLimit.unaSolicitudLimit) */
router.post('/newAvatar', upload.single('avatar'), newAvatar);
router.post('/newInfo', newInfo);
router.post('/newPass', newPass)

module.exports = router;


