import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../../../backend/utils/constants';

const TANK_SIZE = 40;
const BULLET_SIZE = 8;
const MOVE_SPEED = 3;
const ROTATION_SPEED = 90; // Degrees per frame? No, let's stick to 4 directions

const SPRITE_SIZE = 16; // Original size
const SCALE = 2.5; // 16 * 2.5 = 40px

export function useTankLogic(roomId, mode = 'multiplayer') {
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
    const [tanks, setTanks] = useState({});
    const [bullets, setBullets] = useState([]);
    const [explosions, setExplosions] = useState([]);
    const [map, setMap] = useState([]);
    const [myId, setMyId] = useState(socket.id);

    const requestRef = useRef();
    const lastUpdateRef = useRef(0);
    const keysPressed = useRef({});

    const localTank = useRef({
        x: 100,
        y: 100,
        rotation: 0,
        health: 100,
        lastShootTime: 0
    });

    const initGame = useCallback((data) => {
        setTanks(data.tanks);
        setMap(data.map);
        if (data.tanks[socket.id]) {
            localTank.current = { ...data.tanks[socket.id], lastShootTime: 0 };
        }
        setGameState('playing');
    }, []);

    useEffect(() => {
        const handleStarted = (data) => {
            initGame(data);
        };

        const handleUpdate = (data) => {
            setTanks(prev => ({
                ...prev,
                ...data.tanks
            }));
            setBullets(data.bullets);
            if (data.status === 'finished') setGameState('finished');
        };

        const handleExplosion = (data) => {
            setExplosions(prev => [...prev, { ...data, id: Date.now() }]);
            setTimeout(() => {
                setExplosions(prev => prev.filter(e => e.id !== data.id));
            }, 500);
        };

        socket.on(EVENTS.TANK_GAME_STARTED, handleStarted);
        socket.on(EVENTS.TANK_GAME_STATE, handleUpdate);
        socket.on(EVENTS.TANK_EXPLOSION, handleExplosion);

        // If room is already active
        socket.emit(EVENTS.START_TANK_GAME, { roomId });

        return () => {
            socket.off(EVENTS.TANK_GAME_STARTED, handleStarted);
            socket.off(EVENTS.TANK_GAME_STATE, handleUpdate);
            socket.off(EVENTS.TANK_EXPLOSION, handleExplosion);
        };
    }, [roomId, initGame]);

    const handleKeyDown = (e) => {
        keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
        keysPressed.current[e.code] = false;
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const update = useCallback((time) => {
        if (gameState !== 'playing') {
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        const tank = localTank.current;
        if (tank.isDestroyed) return;

        let moved = false;
        let newX = tank.x;
        let newY = tank.y;
        let newRot = tank.rotation;

        if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) {
            newY -= MOVE_SPEED;
            newRot = 0;
            moved = true;
        } else if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) {
            newY += MOVE_SPEED;
            newRot = 180;
            moved = true;
        } else if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) {
            newX -= MOVE_SPEED;
            newRot = 270;
            moved = true;
        } else if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) {
            newX += MOVE_SPEED;
            newRot = 90;
            moved = true;
        }

        // Map collision
        const isPassable = (x, y) => {
            const tx = Math.floor(x / TILE_SIZE);
            const ty = Math.floor(y / TILE_SIZE);
            
            // Check 4 corners of tank
            const corners = [
                {x: x - TANK_SIZE/2 + 2, y: y - TANK_SIZE/2 + 2},
                {x: x + TANK_SIZE/2 - 2, y: y - TANK_SIZE/2 + 2},
                {x: x - TANK_SIZE/2 + 2, y: y + TANK_SIZE/2 - 2},
                {x: x + TANK_SIZE/2 - 2, y: y + TANK_SIZE/2 - 2}
            ];

            for (const c of corners) {
                const ctx = Math.floor(c.x / TILE_SIZE);
                const cty = Math.floor(c.y / TILE_SIZE);
                if (ctx < 0 || ctx >= 20 || cty < 0 || cty >= 20) return false;
                const tile = map[cty][ctx];
                if (tile === 1 || tile === 2 || tile === 3) return false; // Water blocks movement too
            }
            return true;
        };

        if (moved) {
            if (isPassable(newX, newY)) {
                tank.x = newX;
                tank.y = newY;
                tank.rotation = newRot;
            } else {
                // Allow rotation even if blocked
                tank.rotation = newRot;
                moved = true; // Still need to sync rotation
            }
        } else if (newRot !== tank.rotation) {
            tank.rotation = newRot;
            moved = true;
        }

        if (moved) {
            // Sync with server every 50ms or so
            const now = Date.now();
            if (now - lastUpdateRef.current > 50) {
                socket.emit(EVENTS.TANK_UPDATE, { roomId, x: newX, y: newY, rotation: newRot });
                lastUpdateRef.current = now;
            }
        }

        if (keysPressed.current['Space']) {
            const now = Date.now();
            if (!tank.lastShootTime || now - tank.lastShootTime > 500) {
                tank.lastShootTime = now;
                socket.emit(EVENTS.TANK_SHOOT, { roomId, x: tank.x, y: tank.y, rotation: tank.rotation });
            }
        }

        requestRef.current = requestAnimationFrame(update);
    }, [gameState, roomId]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [update]);

    return {
        gameState,
        tanks,
        bullets,
        explosions,
        map,
        myId,
        localTank: localTank.current
    };
}
