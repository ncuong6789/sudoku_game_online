const { EVENTS } = require('../utils/constants');

const TANK_SPEED = 3;
const BULLET_SPEED = 6;
const MAP_SIZE = 800; // 800x800 canvas
const TANK_SIZE = 40;

const startTankGameLoop = (roomId, io, roomManager) => {
    const rooms = roomManager.getAllRooms();
    const room = rooms[roomId];
    if (!room || !room.tankState) return;

    const loop = () => {
        const state = room.tankState;
        if (state.status === 'finished') {
            if (state.intervalId) clearInterval(state.intervalId);
            return;
        }

        // Move bullets
        state.bullets = state.bullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;

            // Boundary check
            if (bullet.x < 0 || bullet.x > MAP_SIZE || bullet.y < 0 || bullet.y > MAP_SIZE) {
                return false;
            }

            // Hit check
            for (const id in state.tanks) {
                const tank = state.tanks[id];
                if (id !== bullet.ownerId && !tank.isDestroyed) {
                    const dist = Math.sqrt((bullet.x - tank.x) ** 2 + (bullet.y - tank.y) ** 2);
                    if (dist < TANK_SIZE / 2) {
                        // Tank hit
                        tank.health -= 25;
                        if (tank.health <= 0) {
                            tank.isDestroyed = true;
                            tank.health = 0;
                            // Check game over
                            const aliveTanks = Object.values(state.tanks).filter(t => !t.isDestroyed);
                            if (aliveTanks.length <= 1) {
                                state.status = 'finished';
                            }
                        }
                        io.to(roomId).emit(EVENTS.TANK_EXPLOSION, { x: bullet.x, y: bullet.y, targetId: id });
                        return false;
                    }
                }
            }

            return true;
        });

        io.to(roomId).emit(EVENTS.TANK_GAME_STATE, {
            tanks: state.tanks,
            bullets: state.bullets,
            status: state.status
        });
    };

    room.tankState.intervalId = setInterval(loop, 1000 / 30); // 30 FPS sync
};

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.TANK_UPDATE, ({ roomId, x, y, rotation }) => {
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        const rooms = roomManager.getAllRooms();
        const room = rooms[actualRoomId];
        if (room && room.tankState && room.tankState.tanks[socket.id]) {
            const tank = room.tankState.tanks[socket.id];
            if (!tank.isDestroyed) {
                tank.x = x;
                tank.y = y;
                tank.rotation = rotation;
            }
        }
    });

    socket.on(EVENTS.TANK_SHOOT, ({ roomId, x, y, rotation }) => {
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        const rooms = roomManager.getAllRooms();
        const room = rooms[actualRoomId];
        if (room && room.tankState && room.tankState.tanks[socket.id]) {
            const tank = room.tankState.tanks[socket.id];
            if (!tank.isDestroyed) {
                const now = Date.now();
                if (!tank.lastShootTime || now - tank.lastShootTime > 500) {
                    tank.lastShootTime = now;
                    
                    const rad = (rotation * Math.PI) / 180;
                    const dx = Math.sin(rad) * BULLET_SPEED;
                    const dy = -Math.cos(rad) * BULLET_SPEED;
                    if (room.tankState.bullets) {
                        room.tankState.bullets.push({
                            ownerId: socket.id,
                            x: x,
                            y: y,
                            dx: dx,
                            dy: dy
                        });
                    }
                    socket.to(actualRoomId).emit(EVENTS.TANK_SHOOT, { ownerId: socket.id, x, y, rotation });
                }
            }
        }
    });

    socket.on(EVENTS.START_TANK_GAME, ({ roomId }) => {
        const rooms = roomManager.getAllRooms();
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        let room = rooms[actualRoomId];

        if (!room && actualRoomId.startsWith('local_')) {
            socket.join(actualRoomId);
            rooms[actualRoomId] = {
                id: actualRoomId,
                gameType: 'tank',
                players: [socket.id, 'CPU']
            };
            room = rooms[actualRoomId];
        }

        if (room && room.gameType === 'tank') {
            socket.join(actualRoomId); // Ensure socket is in room
            const p1Id = room.players[0];
            const p2Id = room.players[1] || 'CPU';

            if (!room.tankState || room.tankState.status !== 'playing') {
                if (room.tankState && room.tankState.intervalId) {
                    clearInterval(room.tankState.intervalId);
                }

                // 20x20 Grid (40px per tile)
                // 0: Empty, 1: Brick, 2: Stone, 3: Water, 4: Bush
                const map = Array(20).fill(0).map(() => Array(20).fill(0));
                // Add some obstacles
                for(let i=0; i<20; i++) {
                    if(i % 4 === 2) {
                        for(let j=2; j<18; j++) map[j][i] = 1; // Brick lines
                    }
                }
                map[10][10] = 2; map[10][9] = 2; // Some stone in middle

                room.tankState = {
                    status: 'playing',
                    intervalId: null,
                    map: map,
                    tanks: {
                        [p1Id]: { id: p1Id, x: 60, y: 60, rotation: 180, health: 100, isDestroyed: false, color: 'green' },
                        [p2Id]: { id: p2Id, x: 740, y: 740, rotation: 0, health: 100, isDestroyed: false, color: 'blue' }
                    },
                    bullets: []
                };

                setTimeout(() => {
                    startTankGameLoop(actualRoomId, io, roomManager);
                }, 1000);
            }

            io.to(actualRoomId).emit(EVENTS.TANK_GAME_STARTED, { 
                roomId: actualRoomId, 
                tanks: room.tankState.tanks,
                map: room.tankState.map
            });
        }
    });
};

module.exports.startTankGameLoop = startTankGameLoop;
