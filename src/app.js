const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { initSocket } = require('./sockets');
const { trafficMiddleware } = require('./controllers/admin.controller');
const app = express();
const server = http.createServer(app);
const io = initSocket(server);

app.use(cookieParser());
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json());
app.use(trafficMiddleware); // ← antes de las rutas

const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

app.use('/api', routes);
app.use(errorMiddleware);

module.exports = { app, server, io };