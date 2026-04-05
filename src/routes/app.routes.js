const express = require('express');
const router = express.Router();

const { ejemplo } = require('../controllers/app.controller');


const auth = require('../middlewares/auth.middleware');

console.log('¿Es función auth?:', typeof auth);
console.log('¿Es función ejemplo?:', typeof ejemplo);

router.get('/test', auth, ejemplo);

/* router.get('/test', auth, (req, res) => {
    // Gracias al middleware 'protect', aquí ya tienes acceso a req.user
    const userId = req.user.id; 
    
    res.status(200).json({
        success: true,
        message: `Cargando mensajes para el usuario ${userId}`
    });
}); */

module.exports = router;


