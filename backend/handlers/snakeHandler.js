const { EVENTS } = require('../utils/constants');

const INITIAL_SPEED = 180;
const MAX_SPEED = 60;

function getReachableCells(head, occupiedSet, mapSize) {
    const queue = [head];
    const reachable = new Set();
    const visited = new Set();
    visited.add(`${head.x},${head.y}`);

    const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];

    while (queue.length > 0) {
        const curr = queue.shift();
        for (const dir of dirs) {
            const nx = curr.x + dir.x;
            const ny = curr.y + dir.y;
            const key = `${nx},${ny}`;

            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !occupiedSet.has(key) && !visited.has(key)) {
                visited.add(key);
                reachable.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
    }
    return Array.from(reachable).map(str => {
        const [x, y] = str.split(',').map(Number);
        return { x, y };
    });
}

function spawnItemIntelligently(snakePositions, deadBodies, mapSize) {
    const occupiedSet = new Set();
    snakePositions.forEach(p => occupiedSet.add(`${p.x},${p.y}`));
    deadBodies.forEach(p => occupiedSet.add(`${p.x},${p.y}`));

    if (snakePositions.length === 0) return {x: 0, y: 0};
    const head = snakePositions[0];
    const reachableEmptyCells = getReachableCells(head, occupiedSet, mapSize);

    if (reachableEmptyCells.length > 0) {
        return reachableEmptyCells[Math.floor(Math.random() * reachableEmptyCells.length)];
    } else {
        const allEmpty = [];
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                if (!occupiedSet.has(`${x},${y}`)) allEmpty.push({x, y});
            }
        }
        if (allEmpty.length > 0) return allEmpty[Math.floor(Math.random() * allEmpty.length)];
        return { x: 0, y: 0 };
    }
}

const startSnakeGameLoop = (roomId, io, roomManager) => {
    const rooms = roomManager.getAllRooms();
    const room = rooms[roomId];
    if (!room || !room.snakeState) return;

    const loop = () => {
        const state = room.snakeState;
        if (state.status === 'finished') {
            clearInterval(state.intervalId);
            return;
        }

        let someoneAte = false;
        let diedThisTurn = [];

        for (const id in state.snakes) {
            const s = state.snakes[id];
            if (s.isDead) continue;

            if (s.directionsQueue && s.directionsQueue.length > 0) {
                s.direction = s.directionsQueue.shift();
            } else if (s.nextDir) {
                s.direction = s.nextDir;
            }

            s.nextDir = s.direction;
            const head = s.positions[0];
            const nx = head.x + s.direction.x;
            const ny = head.y + s.direction.y;

            let died = false;
            if (nx < 0 || nx >= room.mapSize || ny < 0 || ny >= room.mapSize) died = true;
            if (!died && state.deadBodies.some(b => b.x === nx && b.y === ny)) died = true;

            if (!died) {
                for (const otherId in state.snakes) {
                    const otherS = state.snakes[otherId];
                    if (otherS.positions.some((seg, idx) => {
                        if (otherId === id && idx === otherS.positions.length - 1) return false; 
                        return seg.x === nx && seg.y === ny;
                    })) {
                        died = true;
                        break;
                    }
                }
            }

            if (died) {
                diedThisTurn.push(id);
            } else {
                const newHead = { x: nx, y: ny };
                s.positions.unshift(newHead);

                if (nx === state.item.x && ny === state.item.y) {
                    s.score += 1;
                    someoneAte = true;
                } 
                else if (state.goldenItem && nx === state.goldenItem.x && ny === state.goldenItem.y) {
                    s.score += 2;
                    state.goldenItem = null;
                    s.positions.push({ ...s.positions[s.positions.length - 1] });
                }
                else {
                    s.positions.pop(); 
                }
            }
        }

        if (state.goldenItem) {
            if (Date.now() > state.goldenItem.expireAt) {
                state.goldenItem = null;
            } else {
                state.goldenItem.timeLeft = Math.ceil((state.goldenItem.expireAt - Date.now()) / 1000);
            }
        }

        diedThisTurn.forEach(id => {
            const s = state.snakes[id];
            s.isDead = true;
            state.deadBodies.push(...s.positions);
        });

        if (someoneAte) {
            const livingPositions = [];
            for (const id in state.snakes) {
                if (!state.snakes[id].isDead) livingPositions.push(...state.snakes[id].positions);
            }
            state.item = spawnItemIntelligently(livingPositions, state.deadBodies, room.mapSize);
            
            if (Math.random() < 0.15 && !state.goldenItem) {
                const gPos = spawnItemIntelligently(livingPositions, state.deadBodies, room.mapSize);
                state.goldenItem = { ...gPos, expireAt: Date.now() + 5000, timeLeft: 5 };
            }

            let maxScore = Math.max(...Object.values(state.snakes).map(s => s.score));
            state.speed = Math.max(MAX_SPEED, INITIAL_SPEED - maxScore * 5);
            
            clearInterval(state.intervalId);
            state.intervalId = setInterval(loop, state.speed);
        }

        const deadCount = Object.values(state.snakes).filter(s => s.isDead).length;
        const totalSnakes = Object.values(state.snakes).length;
        if (deadCount > 0 || totalSnakes < 2) {
            state.status = 'finished';
            clearInterval(state.intervalId);
        }

        io.to(roomId).emit(EVENTS.SNAKE_GAME_STATE, {
            snakes: state.snakes,
            deadBodies: state.deadBodies,
            item: state.item,
            goldenItem: state.goldenItem,
            status: state.status
        });
    };

    room.snakeState.intervalId = setInterval(loop, room.snakeState.speed);
};

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.SNAKE_CHANGE_DIRECTION, ({ roomId, direction }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && roomManager.isPlayerInRoom(roomId, socket.id) && room.snakeState && room.snakeState.snakes[socket.id] && !room.snakeState.snakes[socket.id].isDead) {
            const snake = room.snakeState.snakes[socket.id];
            if (!snake.directionsQueue) snake.directionsQueue = [];
            const lastDir = snake.directionsQueue.length > 0 
                ? snake.directionsQueue[snake.directionsQueue.length - 1] 
                : snake.direction;
            
            if (direction.x !== 0 && direction.x === -lastDir.x) return;
            if (direction.y !== 0 && direction.y === -lastDir.y) return;

            if (snake.directionsQueue.length < 3) {
                snake.directionsQueue.push(direction);
            }
            snake.nextDir = direction;
        }
    });

    socket.on(EVENTS.SNAKE_DASH, ({ roomId }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id) || !room.snakeState) return;
        const state = room.snakeState;
        const s = state.snakes[socket.id];
        if (!s || s.isDead || state.status === 'finished') return;

        const now = Date.now();
        if (s.dashCooldownEnd && now < s.dashCooldownEnd) return;
        if (s.score < 5) return;

        const h = s.positions[0];
        const dir = s.direction || s.nextDir;
        for (let i = 1; i <= 3; i++) {
            const nx = h.x + dir.x * i;
            const ny = h.y + dir.y * i;
            if (nx < 0 || nx >= room.mapSize || ny < 0 || ny >= room.mapSize) return;
            if (state.deadBodies.some(b => b.x === nx && b.y === ny)) return;
        }

        const newHead = { x: h.x + dir.x * 3, y: h.y + dir.y * 3 };
        for (const otherId in state.snakes) {
            const other = state.snakes[otherId];
            if (other.positions.some(p => p.x === newHead.x && p.y === newHead.y)) {
                s.isDead = true;
                state.deadBodies.push(...s.positions);
                return;
            }
        }

        const newPositions = [
            { x: h.x + dir.x * 3, y: h.y + dir.y * 3 },
            { x: h.x + dir.x * 2, y: h.y + dir.y * 2 },
            { x: h.x + dir.x, y: h.y + dir.y },
            { ...h }
        ];

        const detached = s.positions.slice(1);
        state.deadBodies.push(...detached);
        s.positions = newPositions;
        s.score -= 5;
        s.dashCooldownEnd = now + 3000;
        s.dashFlashEnd = now + 300;

        io.to(roomId).emit(EVENTS.SNAKE_GAME_STATE, {
            snakes: state.snakes,
            deadBodies: state.deadBodies,
            item: state.item,
            goldenItem: state.goldenItem,
            status: state.status,
            dashOccurred: { id: socket.id }
        });
    });

    socket.on(EVENTS.START_SNAKE_GAME, ({ roomId, mapSize }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && room.players.length === 2 && room.gameType === 'snake') {
            const p1Id = room.players[0];
            const p2Id = room.players[1];
            room.mapSize = mapSize || 20;

            room.snakeState = {
                status: 'playing',
                intervalId: null,
                speed: INITIAL_SPEED,
                deadBodies: [],
                item: { x: Math.floor(room.mapSize/2), y: Math.floor(room.mapSize/2) },
                goldenItem: null,
                snakes: {
                    [p1Id]: { id: p1Id, positions: [{ x: 5, y: 5 }, { x: 4, y: 5 }], direction: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, directionsQueue: [], score: 0, isDead: false, color: 'green', dashCooldownEnd: 0, dashFlashEnd: 0 },
                    [p2Id]: { id: p2Id, positions: [{ x: room.mapSize - 6, y: room.mapSize - 6 }, { x: room.mapSize - 5, y: room.mapSize - 6 }], direction: { x: -1, y: 0 }, nextDir: { x: -1, y: 0 }, directionsQueue: [], score: 0, isDead: false, color: 'blue', dashCooldownEnd: 0, dashFlashEnd: 0 }
                }
            };
            
            io.to(p1Id).emit(EVENTS.SNAKE_GAME_STARTED, { roomId, mapSize: room.mapSize, color: 'green' });
            io.to(p2Id).emit(EVENTS.SNAKE_GAME_STARTED, { roomId, mapSize: room.mapSize, color: 'blue' });

            setTimeout(() => {
                startSnakeGameLoop(roomId, io, roomManager);
            }, 2000);
        }
    });
};

module.exports.startSnakeGameLoop = startSnakeGameLoop;
