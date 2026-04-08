import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';

export function useTankLogic(roomId, mode = 'multiplayer') {
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished, win
    const [players, setPlayers] = useState({});
    const [enemies, setEnemies] = useState({});
    const [bullets, setBullets] = useState([]);
    const [items, setItems] = useState({});
    const [explosions, setExplosions] = useState([]);
    const [map, setMap] = useState([]);
    const [base, setBase] = useState(null);
    const [enemiesLeft, setEnemiesLeft] = useState(20);
    const [myId, setMyId] = useState(socket.id);

    const requestRef = useRef();
    const lastUpdateRef = useRef(0);
    const keysPressed = useRef({});

    // Client-side prediction for local player
    const localTank = useRef({
        x: 8,
        y: 24,
        dir: 'up',
        hp: 1,
        lastShootTime: 0
    });

    const initGame = useCallback((data) => {
        setMap(data.map);
        if (data.players && data.players[socket.id]) {
            localTank.current = { ...data.players[socket.id], lastShootTime: 0 };
        }
        setGameState('playing');
    }, []);

    useEffect(() => {
        const handleStarted = (data) => {
            initGame(data);
        };

        const handleUpdate = (data) => {
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

            // Sync server position if our prediction is wildly off, 
            // but for simplicity let's just let server dictate or client dictate 
            // In a simple setup, trust the client's local position, but if killed, update it.
            if (data.players && data.players[socket.id] && data.players[socket.id].hp <= 0) {
                 // Dead, rely on server
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
            socket.emit(EVENTS.START_TANK_GAME, { roomId });
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
        // Prevent default scrolling for arrows and space
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
        // Don't move if dead
        if (tank.hp <= 0 || !players[myId] || players[myId].hp <= 0) {
             requestRef.current = requestAnimationFrame(update);
             return;
        }

        // Client-side prediction — use localTank for smooth movement
        // Server runs at 20fps (speed 0.15/tick). Client runs at 60fps.
        // Per-frame client speed = 0.15 * (20/60) = 0.050 units
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

        // Clamp to map bounds
        newX = Math.max(0, Math.min(24.2, newX));
        newY = Math.max(0, Math.min(24.2, newY));

        if (moved) {
            tank.x = newX;
            tank.y = newY;
            tank.dir = newDir;

            const now = Date.now();
            // Throttle to ~15 updates/sec to stay well under server 20/sec rate limit
            if (now - lastUpdateRef.current > 67) {
                socket.emit(EVENTS.TANK_UPDATE, { roomId, x: newX, y: newY, dir: newDir });
                lastUpdateRef.current = now;
            }
        } else if (newDir !== tank.dir) {
            tank.dir = newDir;
            socket.emit(EVENTS.TANK_UPDATE, { roomId, x: newX, y: newY, dir: newDir }); // direction-only sync
        }

        if (keysPressed.current['Space']) {
            const now = Date.now();
            const cooldown = (players[myId].starLevel >= 1) ? 200 : 300;
            if (!tank.lastShootTime || now - tank.lastShootTime > cooldown) {
                tank.lastShootTime = now;
                socket.emit(EVENTS.TANK_SHOOT, { roomId, ...players[myId], dir: tank.dir });
            }
        }

        requestRef.current = requestAnimationFrame(update);
    }, [gameState, roomId, players, myId]);

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
        localTankRef: localTank  // return the ref itself, not .current, so render never stales
    };
}
