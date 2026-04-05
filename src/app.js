const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');



const app = express();

app.use(cookieParser());

app.use(cors({
    origin: 'http://localhost:5173', // O el puerto que use tu Vite/React
    credentials: true                // Permite el envío de cookies/headers de autenticación
}));
app.use(express.json());


const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

app.use('/api', routes);

app.use(errorMiddleware);

module.exports = app;
