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
    origin: (origin, callback) => {
        // Cho phép: Vercel (gameonl.vercel.app), localhost, và không có origin (Postman/server-to-server)
        const allowed = !origin
            || origin.includes('vercel.app')
            || origin.includes('localhost')
            || origin.includes('onrender.com')
            || origin === process.env.FRONTEND_URL;
        if (allowed) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gameonl";
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('------------------------------------');
        console.log('✅ THIẾT LẬP KẾT NỐI MONGODB THÀNH CÔNG');
        console.log('URL:', MONGO_URI.includes('@') ? MONGO_URI.split('@')[1] : 'Localhost');
        console.log('------------------------------------');
    })
    .catch(err => {
        console.error('------------------------------------');
        console.error('❌ LỖI KẾT NỐI MONGODB:');
        console.error(err.message);
        console.error('------------------------------------');
    });

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const healthRoutes = require('./routes/health');
app.use('/api/health', healthRoutes);

const server = http.createServer(app);
const allowedOriginFn = (origin, callback) => {
    const allowed = !origin
        || origin.includes('vercel.app')
        || origin.includes('localhost')
        || origin.includes('onrender.com')
        || origin === process.env.FRONTEND_URL;
    if (allowed) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
};
const io = new Server(server, {
    cors: {
        origin: allowedOriginFn,
        methods: ['GET', 'POST'],
        credentials: true
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
const registerTankHandler = require('./handlers/tankHandler');

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
    registerTankHandler(io, socket, roomManager);

    socket.on('disconnect', () => {
        delete rateLimitMap[socket.id];
        roomManager.handlePlayerDisconnect(socket);
        console.log('User disconnected:', socket.id);
    });
});

// Inject io + roomManager into health route for diagnostics
healthRoutes.init(io, roomManager);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
