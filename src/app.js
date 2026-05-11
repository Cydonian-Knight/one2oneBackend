const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { initSocket } = require('./sockets');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) { callback(null, true); },
    credentials: true
}));
app.use(express.json());

const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

app.use('/api', routes);
app.use(errorMiddleware);

module.exports = { app, server, io };