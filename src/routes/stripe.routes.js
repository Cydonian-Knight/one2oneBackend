const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const auth = require('../middlewares/auth.middleware');


const PRICE_IDS = {
    monthly: 'price_1TXxHF3olsSfieizr80eRwU2',
    biannual: 'price_1TXxHh3olsSfieizfNDMO9fA',
    annual: 'price_1TXxI13olsSfieizSDH5L5xf',
};

// Días que agrega cada plan
const PLAN_DAYS = {
    monthly: 30,
    biannual: 180,
    annual: 365,
};

router.use(auth);

router.post('/create-checkout', async (req, res) => {
    const { plan } = req.body;
    if (!PRICE_IDS[plan]) return res.status(400).json({ error: 'Plan no válido' });

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
            success_url: `one2onefrontend.vercel.app/chat/settings/payment?checkout=success&plan=${plan}`,
            cancel_url: `one2onefrontend.vercel.app/chat/settings/payment?checkout=cancelled`,
            customer_email: req.user?.email,
            metadata: { userId: req.user?.id, plan },
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe error:', err.message);
        res.status(500).json({ error: 'Error al crear la sesión' });
    }
});

router.post('/activate', async (req, res) => {
    const { plan } = req.body;
    const userId = req.user?.id;
    console.log('👉 req.user:', req.user);


    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    if (!PLAN_DAYS[plan]) return res.status(400).json({ error: 'Plan no válido' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        console.log('👉 usuario encontrado:', user);

        const now = new Date();

        // Si no tiene suscripción o ya expiró, arranca desde hoy
        // Si todavía tiene días restantes, los acumula
        const base = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
            ? user.subscriptionExpiresAt
            : now;

        const newExpiry = new Date(base);
        newExpiry.setDate(newExpiry.getDate() + PLAN_DAYS[plan]);

        user.subscriptionExpiresAt = newExpiry;
        await user.save();

        res.json({ subscriptionExpiresAt: newExpiry });
    } catch (err) {
        console.error('Activate error:', err.message);
        res.status(500).json({ error: 'Error al activar suscripción' });
    }
});

module.exports = router;
