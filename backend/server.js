require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./managers/RoomManager');

const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL || 'https://gameonl.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

const app = express();
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gameonl";
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST']
    },
    transports: ['websocket']
});

// --- RATE LIMITING ---
const MAX_EVENTS_PER_SEC = 20;
const rateLimitMap = {};
io.use((socket, next) => {
    // Authenticate JWT if provided
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
            socket.userId = decoded.userId;
            socket.username = decoded.username;
        } catch (err) {
            // Allow joining as guest if token expires
        }
    }

    socket.use((packet, nextMiddleware) => {
        const now = Date.now();
        let limitD = rateLimitMap[socket.id];
        if (!limitD) {
            limitD = { count: 0, lastReset: now };
            rateLimitMap[socket.id] = limitD;
        }
        if (now - limitD.lastReset > 1000) {
            limitD.count = 0;
            limitD.lastReset = now;
        }
        limitD.count++;
        if (limitD.count > MAX_EVENTS_PER_SEC) {
            return nextMiddleware(new Error('Rate limit exceeded'));
        }
        nextMiddleware();
    });
    next();
});

// Handlers
const registerGeneralHandler = require('./handlers/generalHandler');
const registerMatchmakingHandler = require('./handlers/matchmakingHandler');
const registerCaroHandler = require('./handlers/caroHandler');
const registerChessHandler = require('./handlers/chessHandler');
const registerSnakeHandler = require('./handlers/snakeHandler');
const registerTetrisHandler = require('./handlers/tetrisHandler');

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register all specific handlers
    registerGeneralHandler(io, socket, roomManager);
    registerMatchmakingHandler(io, socket, roomManager);
    registerCaroHandler(io, socket, roomManager);
    registerChessHandler(io, socket, roomManager);
    registerSnakeHandler(io, socket, roomManager);
    registerTetrisHandler(io, socket, roomManager);

    socket.on('disconnect', () => {
        delete rateLimitMap[socket.id];
        roomManager.handlePlayerDisconnect(socket);
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
