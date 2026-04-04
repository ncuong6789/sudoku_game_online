/**
 * Backend Health Check Routes
 * Provides diagnostic endpoints for testing game server status.
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// io and roomManager are injected from server.js
let _io = null;
let _roomManager = null;

router.init = (io, roomManager) => {
    _io = io;
    _roomManager = roomManager;
};

/**
 * GET /api/health
 * Full health check: DB, memory, uptime, socket count
 */
router.get('/', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    }[dbState] || 'unknown';

    const memUsage = process.memoryUsage();

    const socketCount = _io ? _io.engine.clientsCount : 0;

    res.json({
        status: dbState === 1 ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        db: {
            status: dbStatus,
            host: mongoose.connection.host || 'unknown',
        },
        server: {
            uptime: Math.floor(process.uptime()),
            uptimeHuman: formatUptime(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
        },
        memory: {
            rss: formatBytes(memUsage.rss),
            heapUsed: formatBytes(memUsage.heapUsed),
            heapTotal: formatBytes(memUsage.heapTotal),
        },
        sockets: {
            connected: socketCount,
        },
    });
});

/**
 * GET /api/health/rooms
 * List active game rooms (from RoomManager)
 */
router.get('/rooms', (req, res) => {
    if (!_roomManager) {
        return res.status(503).json({ error: 'RoomManager not initialized' });
    }

    try {
        // RoomManager stores rooms in this.rooms map
        const rooms = _roomManager.rooms || new Map();
        const roomList = [];

        rooms.forEach((room, roomId) => {
            roomList.push({
                id: roomId,
                game: room.game || 'unknown',
                players: room.players ? room.players.length : 0,
                maxPlayers: room.maxPlayers || 2,
                status: room.status || 'waiting',
                createdAt: room.createdAt || null,
            });
        });

        res.json({
            count: roomList.length,
            rooms: roomList,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/health/sockets
 * Count and list connected sockets
 */
router.get('/sockets', async (req, res) => {
    if (!_io) {
        return res.status(503).json({ error: 'Socket.IO not initialized' });
    }

    try {
        const sockets = await _io.fetchSockets();
        res.json({
            count: sockets.length,
            ids: sockets.slice(0, 20).map(s => ({
                id: s.id,
                rooms: [...s.rooms],
                userId: s.data?.userId || null,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
}

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

module.exports = router;
