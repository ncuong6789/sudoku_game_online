import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';

const MAP_COLS = 26;
const MAP_ROWS = 26;
const TANK_SIZE = 1.8;

// Tile types: 0=empty 1=brick 2=steel 3=water
const TILE_MAP = {
    '.': 0, '#': 1, '@': 2, '~': 3, '%': 4, '-': 5
};

export function useTankLogic(roomId, mode = 'multiplayer', startLevel = 1) {
    const [gameState, setGameState] = useState('waiting');
    const [players, setPlayers] = useState({});
    const [enemies, setEnemies] = useState({});
    const [bullets, setBullets] = useState([]);
    const [items, setItems] = useState({});
    const [explosions, setExplosions] = useState([]);
    const [map, setMap] = useState([]);
    const [base, setBase] = useState(null);
    const [enemiesLeft, setEnemiesLeft] = useState(20);
    const [myId, setMyId] = useState(socket.id);
    const [level, setLevel] = useState(startLevel);
    const [maxLevel, setMaxLevel] = useState(35);

    const requestRef = useRef();
    const lastUpdateRef = useRef(0);
    const keysPressed = useRef({});

    const localTank = useRef({
        x: 8,
        y: 24,
        dir: 'up',
        hp: 1,
        lastShootTime: 0
    });

    // Client-side collision check
    const checkWallCollision = useCallback((x, y, w, h, gameMap, currentBase) => {
        if (!gameMap || gameMap.length === 0) return false;
        
        // Bounds check
        if (x < 0 || x + w > MAP_COLS || y < 0 || y + h > MAP_ROWS) return true;
        
        // Grid tiles
        const sr = Math.floor(y), er = Math.floor(y + h - 0.01);
        const sc = Math.floor(x), ec = Math.floor(x + w - 0.01);
        
        for (let r = sr; r <= er; r++) {
            for (let c = sc; c <= ec; c++) {
                if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
                    const t = gameMap[r]?.[c];
                    if (t === 1 || t === 2 || t === 3) return true; // Brick, Steel or Water blocks
                }
            }
        }

        // Base collision
        if (currentBase && !currentBase.destroyed) {
            if (x < currentBase.x + currentBase.w && x + w > currentBase.x &&
                y < currentBase.y + currentBase.h && y + h > currentBase.y) {
                return true;
            }
        }

        return false;
    }, []);

    const checkTankCollision = useCallback((x, y, w, h, ignoreId, allPlayers, allEnemies) => {
        const allTanks = [...Object.values(allPlayers || {}), ...Object.values(allEnemies || {})];
        for (const t of allTanks) {
            if (t.id === ignoreId || t.hp <= 0) continue;
            const x1 = x + 0.1, y1 = y + 0.1, w1 = w - 0.2, h1 = h - 0.2;
            const x2 = t.x + 0.1, y2 = t.y + 0.1, w2 = t.w - 0.2, h2 = t.h - 0.2;
            if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) return true;
        }
        return false;
    }, []);

    const initGame = useCallback((data) => {
        setMap(data.map);
        if (data.players && data.players[socket.id]) {
            localTank.current = { ...data.players[socket.id], lastShootTime: 0 };
        }
        if (data.level) setLevel(data.level);
        if (data.maxLevel) setMaxLevel(data.maxLevel);
        setGameState('playing');
    }, []);

    useEffect(() => {
        const handleStarted = (data) => {
            initGame(data);
        };

        const handleUpdate = (data) => {
            // Interpolate server position smoothly
            const serverTank = data.players?.[socket.id];
            if (serverTank && localTank.current && localTank.current.hp > 0) {
                // Only sync position if difference is large (server authoritative)
                const dx = Math.abs(serverTank.x - localTank.current.x);
                const dy = Math.abs(serverTank.y - localTank.current.y);
                if (dx > 0.5 || dy > 0.5) {
                    localTank.current.x = serverTank.x;
                    localTank.current.y = serverTank.y;
                }
            }
            
            setPlayers(data.players || {});
            setEnemies(data.enemies || {});
            setBullets(data.bullets || []);
            setItems(data.items || {});
            setMap(data.map || []);
            setBase(data.base || null);
            setEnemiesLeft(data.enemiesLeft || 0);

            if (data.status === 'finished' || data.status === 'win') {
                setGameState(data.status);
            }

            if (data.players && data.players[socket.id] && data.players[socket.id].hp <= 0) {
                localTank.current.hp = 0;
            }
        };

        const handleExplosion = (data) => {
            setExplosions(prev => [...prev, { ...data, id: Date.now() + Math.random() }]);
            setTimeout(() => {
                setExplosions(prev => prev.filter(e => e.id !== data.id));
            }, 300);
        };

        const onConnect = () => {
            setMyId(socket.id);
            socket.emit(EVENTS.START_TANK_GAME, { roomId, level: startLevel });
        };

        socket.on(EVENTS.TANK_GAME_STARTED, handleStarted);
        socket.on(EVENTS.TANK_GAME_STATE, handleUpdate);
        socket.on(EVENTS.TANK_EXPLOSION, handleExplosion);

        if (socket.connected) {
            onConnect();
        } else {
            socket.on('connect', onConnect);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off(EVENTS.TANK_GAME_STARTED, handleStarted);
            socket.off(EVENTS.TANK_GAME_STATE, handleUpdate);
            socket.off(EVENTS.TANK_EXPLOSION, handleExplosion);
        };
    }, [roomId, initGame]);

    const handleKeyDown = (e) => {
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code) > -1) {
            e.preventDefault();
        }
        keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
        keysPressed.current[e.code] = false;
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const update = useCallback(() => {
        if (gameState !== 'playing') {
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        const tank = localTank.current;
        if (tank.hp <= 0 || !players[myId] || players[myId].hp <= 0) {
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        const speed = 0.050;
        let moved = false;
        let newX = tank.x;
        let newY = tank.y;
        let newDir = tank.dir;

        if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) {
            newY -= speed;
            newDir = 'up';
            moved = true;
        } else if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) {
            newY += speed;
            newDir = 'down';
            moved = true;
        } else if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) {
            newX -= speed;
            newDir = 'left';
            moved = true;
        } else if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) {
            newX += speed;
            newDir = 'right';
            moved = true;
        }

        // Client-side collision detection
        if (moved) {
            let canMove = !checkWallCollision(newX, newY, TANK_SIZE, TANK_SIZE, map, base) &&
                           !checkTankCollision(newX, newY, TANK_SIZE, TANK_SIZE, myId, players, enemies);
            
            // Auto corner-slip assist
            if (!canMove) {
                const trySlides = [0.05, 0.1, 0.15, 0.2, 0.25];
                if (newDir === 'up' || newDir === 'down') {
                    for (let s of trySlides) {
                        if (!checkWallCollision(newX - s, newY, TANK_SIZE, TANK_SIZE, map, base) && !checkTankCollision(newX - s, newY, TANK_SIZE, TANK_SIZE, myId, players, enemies)) {
                            newX -= speed; // Slide left slowly
                            canMove = true; break;
                        } else if (!checkWallCollision(newX + s, newY, TANK_SIZE, TANK_SIZE, map, base) && !checkTankCollision(newX + s, newY, TANK_SIZE, TANK_SIZE, myId, players, enemies)) {
                            newX += speed; // Slide right slowly
                            canMove = true; break;
                        }
                    }
                } else if (newDir === 'left' || newDir === 'right') {
                    for (let s of trySlides) {
                        if (!checkWallCollision(newX, newY - s, TANK_SIZE, TANK_SIZE, map, base) && !checkTankCollision(newX, newY - s, TANK_SIZE, TANK_SIZE, myId, players, enemies)) {
                            newY -= speed; // Slide up slowly
                            canMove = true; break;
                        } else if (!checkWallCollision(newX, newY + s, TANK_SIZE, TANK_SIZE, map, base) && !checkTankCollision(newX, newY + s, TANK_SIZE, TANK_SIZE, myId, players, enemies)) {
                            newY += speed; // Slide down slowly
                            canMove = true; break;
                        }
                    }
                }
            }
            
            if (canMove) {
                tank.x = newX;
                tank.y = newY;
                tank.dir = newDir;
                
                const now = Date.now();
                if (now - lastUpdateRef.current > 67) {
                    socket.emit(EVENTS.TANK_UPDATE, { roomId, x: newX, y: newY, dir: newDir });
                    lastUpdateRef.current = now;
                }
            } else {
                // Can't move - just update direction
                tank.dir = newDir;
                const now = Date.now();
                if (now - lastUpdateRef.current > 67) {
                    socket.emit(EVENTS.TANK_UPDATE, { roomId, x: tank.x, y: tank.y, dir: newDir });
                    lastUpdateRef.current = now;
                }
            }
        } else if (newDir !== tank.dir) {
            tank.dir = newDir;
            const now = Date.now();
            if (now - lastUpdateRef.current > 67) {
                socket.emit(EVENTS.TANK_UPDATE, { roomId, x: tank.x, y: tank.y, dir: newDir });
                lastUpdateRef.current = now;
            }
        }

        if (keysPressed.current['Space']) {
            const now = Date.now();
            const cooldown = (players[myId]?.starLevel >= 1) ? 200 : 300;
            if (!tank.lastShootTime || now - tank.lastShootTime > cooldown) {
                tank.lastShootTime = now;
                socket.emit(EVENTS.TANK_SHOOT, { 
                    roomId, 
                    x: tank.x, 
                    y: tank.y, 
                    dir: tank.dir 
                });
            }
        }

        requestRef.current = requestAnimationFrame(update);
    }, [gameState, roomId, players, enemies, map, base, myId, checkWallCollision, checkTankCollision]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [update]);

    return {
        gameState,
        players,
        enemies,
        bullets,
        items,
        explosions,
        map,
        base,
        enemiesLeft,
        myId,
        localTankRef: localTank,
        level,
        maxLevel
    };
}
