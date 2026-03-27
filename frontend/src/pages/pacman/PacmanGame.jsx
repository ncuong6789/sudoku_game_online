import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Heart, Ghost as GhostIcon } from 'lucide-react';
import { useAudio } from '../../utils/useAudio';

// ─── Map Definition ─────────────────────────────────────────────────────────────
// W=wall  .=dot  P=PowerPill  _=floor(no dot)  S=Pacman start  G=Ghost spawn  H=Ghost gate
// All rows must be exactly 21 chars.
// Ghost house: walls at x=7 and x=13, interior x=8-12, gate H at x=10.
// Exit path: ghosts go (x=10,y=10→9=H→8=floor→7=floor→6=maze).

const MAP_ROWS = [
    "WWWWWWWWWWWWWWWWWWWWW",  // 0  top wall
    "W.........W.........W",  // 1
    "W.WWW.WWW.W.WWW.WWW.W",  // 2
    "WP.WW.WWW.W.WWW.WW.PW",  // 3  power pills col 1 & 19
    "W...................W",  // 4
    "W.WWW.W.WWWWW.W.WWW.W",  // 5
    "W.....W...W...W.....W",  // 6
    "WWWWWWW___W___WWWWWWW",  // 7  wall with floor opening at x=7-9 & x=11-13? No: center open
    "W......W__H__W......W",  // 8  ghost house gate row (H at x=10)
    "W......W_GGGG_W.....W",  // 9  ghost positions (x=8:_, x=9-12:G, x=13:W)
    "W......WWWWWWWW.....W",  // 10 ghost house bottom wall
    "W...................W",  // 11
    "W.WWW.W.WWWWW.W.WWW.W",  // 12
    "W.....W...W...W.....W",  // 13
    "W.....WWWWWWWWWW....W",  // 14 partial wall above pacman
    "W..........S........W",  // 15 PACMAN START at x=11
    "W.WWW.WWW.W.WWW.WWW.W",  // 16
    "WP..W.....W.....W..PW",  // 17 power pills col 1 & 19
    "WWW.W.W.WWWWW.W.W.WWW",  // 18
    "W.....W.......W.....W",  // 19
    "W.WWWWWWW.W.WWWWWWW.W",  // 20
    "W...................W",  // 21
    "WWWWWWWWWWWWWWWWWWWWW",  // 22 bottom wall
];

const DIRS = { UP:{x:0,y:-1}, DOWN:{x:0,y:1}, LEFT:{x:-1,y:0}, RIGHT:{x:1,y:0} };
const DIR_LIST = Object.values(DIRS);

const GHOST_COLORS = { BLINKY:'#ef4444', PINKY:'#f9a8d4', INKY:'#06b6d4', CLYDE:'#fb923c' };
const GHOST_NAMES  = ['BLINKY','PINKY','INKY','CLYDE'];

// Detection ranges (Manhattan dist) per ghost
const GHOST_RANGES = { BLINKY:30, PINKY:10, INKY:7, CLYDE:12 };

const isSameDir = (a,b) => a.x===b.x && a.y===b.y;
const getOpp   = d => ({x:-d.x, y:-d.y});

// BFS – returns first step toward target
function bfsStep(start, target, grid) {
    if (!grid.length) return null;
    const rows = grid.length, cols = grid[0].length;
    const visited = new Set([`${start.x},${start.y}`]);
    const queue = [{x:start.x, y:start.y, first:null}];
    while (queue.length) {
        const cur = queue.shift();
        if (cur.x===target.x && cur.y===target.y) return cur.first;
        for (const d of DIR_LIST) {
            let nx=cur.x+d.x, ny=cur.y+d.y;
            if (nx<0) nx=cols-1; if (nx>=cols) nx=0;
            if (ny<0||ny>=rows) continue;
            const cell=grid[ny][nx];
            if (cell==='W') continue;
            const key=`${nx},${ny}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({x:nx,y:ny, first: cur.first ?? d});
            }
        }
    }
    return null;
}

// Parse the raw map strings into grid, dots, pills, ghost/pacman positions
function parseMap() {
    const grid=[], dots=new Set(), pills=new Set(), ghosts=[];
    let pStart=null;
    const maxLen = Math.max(...MAP_ROWS.map(r=>r.length));
    MAP_ROWS.forEach((row,y) => {
        const r = row.padEnd(maxLen,'_');
        const cells=[];
        for (let x=0;x<r.length;x++) {
            const ch=r[x];
            cells.push(ch);
            if (ch==='.') dots.add(`${x},${y}`);
            else if (ch==='P') pills.add(`${x},${y}`);
            else if (ch==='S') { pStart={x,y}; }
            else if (ch==='G' && ghosts.length<4) {
                const name=GHOST_NAMES[ghosts.length];
                ghosts.push({id:name, color:GHOST_COLORS[name], x,y, startX:x,startY:y, dir:DIRS.UP, state:'house'});
            }
        }
        grid.push(cells);
    });
    if (!pStart) pStart={x:10,y:15};
    return {grid, dots, pills, ghosts, pStart};
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function PacmanGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mapType='Classic' } = location.state || {};

    const { playWinSound, playLoseSound, playPacmanStartSound,
            playPacmanWakaSound, playPacmanPowerPillSound,
            playPacmanEatGhostSound, playPacmanDieSound } = useAudio();

    const [mapGrid,   setMapGrid]   = useState([]);
    const [pacman,    setPacman]    = useState(null);
    const [ghosts,    setGhosts]    = useState([]);
    const [dots,      setDots]      = useState(new Set());
    const [powerPills,setPowerPills]= useState(new Set());
    const [score,     setScore]     = useState(0);
    const [lives,     setLives]     = useState(3);
    const [gameOver,  setGameOver]  = useState(false);
    const [gameWon,   setGameWon]   = useState(false);
    const [frightenedTimer,setFrightenedTimer] = useState(0);
    const [gamePhase, setGamePhase] = useState('ready'); // 'ready','playing','dying','over','won'
    const [ghostExitTimer, setGhostExitTimer] = useState(0);

    // Stale-closure-safe refs
    const stateRef = useRef({});
    useEffect(() => {
        stateRef.current = {pacman,ghosts,dots,powerPills,score,lives,
                           gameOver,gameWon,frightenedTimer,gamePhase,mapGrid,ghostExitTimer};
    });

    const snd = useRef({});
    useEffect(() => {
        snd.current = {playWinSound,playLoseSound,playPacmanWakaSound,
                       playPacmanPowerPillSound,playPacmanEatGhostSound,playPacmanDieSound};
    },[playWinSound,playLoseSound,playPacmanWakaSound,playPacmanPowerPillSound,playPacmanEatGhostSound,playPacmanDieSound]);

    const nextDirRef = useRef(DIRS.LEFT);

    // ── Init ───────────────────────────────────────────────────────────────────
    const initGame = useCallback(() => {
        const {grid,dots:d,pills,ghosts:g,pStart} = parseMap();
        setMapGrid(grid);
        setPacman({...pStart, startX:pStart.x, startY:pStart.y, dir:DIRS.LEFT, isDying:false});
        setDots(d); setPowerPills(pills); setGhosts(g);
        setScore(0); setLives(3);
        setGameOver(false); setGameWon(false);
        setFrightenedTimer(0); setGhostExitTimer(0);
        nextDirRef.current = DIRS.LEFT;
        setGamePhase('ready');
        try { playPacmanStartSound(); } catch(e) {}
        setTimeout(() => setGamePhase('playing'), 2000);
    }, [playPacmanStartSound]);

    useEffect(() => { initGame(); }, []); // eslint-disable-line

    // ── Keyboard ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const m = {ArrowUp:DIRS.UP,ArrowDown:DIRS.DOWN,ArrowLeft:DIRS.LEFT,ArrowRight:DIRS.RIGHT};
        const h = e => { if (m[e.key]) { e.preventDefault(); nextDirRef.current=m[e.key]; }};
        window.addEventListener('keydown',h);
        return ()=>window.removeEventListener('keydown',h);
    },[]);

    // ── Ghost Exit Timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (gamePhase !== 'playing') return;
        let tick = 0;
        const exitOrder = [0, 60, 120, 180]; // frames before each ghost exits
        const id = setInterval(() => {
            tick++;
            setGhosts(prev => prev.map((g,i) => {
                if (g.state==='house' && tick >= exitOrder[i]) {
                    return {...g, state:'chase', x: g.startX, y: g.startY};
                }
                return g;
            }));
        }, 100);
        return () => clearInterval(id);
    }, [gamePhase]); // eslint-disable-line

    // ── Game Loop ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (gamePhase !== 'playing') return;
        const SPEED = 165;

        const tick = () => {
            const s = stateRef.current;
            if (s.gamePhase!=='playing' || !s.pacman || !s.mapGrid.length) return;

            const grid=s.mapGrid, cols=grid[0].length, rows=grid.length;

            // ── PACMAN MOVE ─────────────────────────────────────────────────
            const tryStep = (pos, dir) => {
                let nx=pos.x+dir.x, ny=pos.y+dir.y;
                if (nx<0) nx=cols-1; if (nx>=cols) nx=0;
                if (ny<0||ny>=rows) return null;
                const c=grid[ny][nx];
                if (c==='W'||c==='H') return null;
                return {x:nx,y:ny};
            };

            let np = {...s.pacman};
            const wanted = tryStep(np, nextDirRef.current);
            if (wanted) { np={...np,...wanted,dir:nextDirRef.current}; }
            else {
                const cont = tryStep(np, np.dir);
                if (cont) np={...np,...cont};
            }

            const pk=`${np.x},${np.y}`;
            let newDots=s.dots, newPills=s.powerPills, sd=0;
            let newFr = s.frightenedTimer>0 ? s.frightenedTimer-1 : 0;

            if (s.dots.has(pk)) {
                newDots=new Set(s.dots); newDots.delete(pk); sd+=10;
                try{snd.current.playPacmanWakaSound();}catch(e){}
                if (newDots.size===0){ setGameWon(true); setGamePhase('won'); try{snd.current.playWinSound();}catch(e){} return; }
            }
            if (s.powerPills.has(pk)) {
                newPills=new Set(s.powerPills); newPills.delete(pk); sd+=50;
                newFr=35;
                try{snd.current.playPacmanPowerPillSound();}catch(e){}
            }

            // ── GHOST MOVE ──────────────────────────────────────────────────
            const isFr = newFr>0;
            let combo=0;
            const newGhosts = s.ghosts.map(g => {
                if (g.state==='house') return g; // waiting to exit

                let cg={...g};
                // State transitions
                if (isFr && cg.state!=='dead') cg.state='frightened';
                else if (!isFr && cg.state==='frightened') cg.state='chase';
                if (cg.state==='dead' && cg.x===cg.startX && cg.y===cg.startY) cg.state='chase';

                // Passable cells depend on state
                const canPass = cell => {
                    if (cell==='W') return false;
                    if (cell==='H') return cg.state==='dead'; // only dead ghosts pass gate
                    return true;
                };

                const opp = getOpp(cg.dir);
                const validDirs = DIR_LIST.filter(d => {
                    if (cg.state!=='dead' && isSameDir(d,opp)) return false; // no reversal unless dead
                    let nx=cg.x+d.x, ny=cg.y+d.y;
                    if (nx<0) nx=cols-1; if (nx>=cols) nx=0;
                    if (ny<0||ny>=rows) return false;
                    return canPass(grid[ny][nx]);
                });
                if (validDirs.length===0) validDirs.push(opp);

                // Choose direction using A* vs wander
                let chosen=validDirs[Math.floor(Math.random()*validDirs.length)];

                if (cg.state==='dead') {
                    // A* back to spawn
                    const step = bfsStep(cg,{x:cg.startX,y:cg.startY},grid);
                    if (step && validDirs.some(d=>isSameDir(d,step))) chosen=step;
                } else if (cg.state==='chase') {
                    const dist = Math.abs(cg.x-np.x)+Math.abs(cg.y-np.y);
                    const range = GHOST_RANGES[cg.id] ?? 8;
                    if (dist<=range) {
                        // A* chase target
                        let target={x:np.x,y:np.y};
                        if (cg.id==='PINKY') target={x:np.x+np.dir.x*4, y:np.y+np.dir.y*4};
                        else if (cg.id==='CLYDE' && dist<5) target={x:1,y:rows-2};
                        const step = bfsStep(cg,target,grid);
                        if (step && validDirs.some(d=>isSameDir(d,step))) chosen=step;
                    }
                    // else wander randomly (already set above)
                }

                cg.dir=chosen;
                cg.x+=chosen.x; cg.y+=chosen.y;
                if (cg.x<0) cg.x=cols-1; if (cg.x>=cols) cg.x=0;
                return cg;
            });

            // ── COLLISION ────────────────────────────────────────────────────
            let pacDied=false;
            const finalGhosts = newGhosts.map(cg => {
                if ((cg.x===np.x&&cg.y===np.y)||(cg.x===s.pacman.x&&cg.y===s.pacman.y)) {
                    if (cg.state==='frightened') {
                        combo++; sd+=200*Math.pow(2,combo-1);
                        try{snd.current.playPacmanEatGhostSound();}catch(e){}
                        return {...cg,state:'dead'};
                    } else if (cg.state!=='dead'&&cg.state!=='house') {
                        pacDied=true;
                    }
                }
                return cg;
            });

            if (pacDied) {
                try{snd.current.playPacmanDieSound();}catch(e){}
                const newLives = s.lives-1;
                setGamePhase('dying');
                setTimeout(() => {
                    if (newLives<=0) {
                        setLives(0); setGameOver(true); setGamePhase('over');
                        try{snd.current.playLoseSound();}catch(e){}
                    } else {
                        setLives(newLives);
                        const {ghosts:g,pStart}=parseMap();
                        setPacman({...pStart,startX:pStart.x,startY:pStart.y,dir:DIRS.LEFT,isDying:false});
                        setGhosts(g);
                        setFrightenedTimer(0);
                        nextDirRef.current=DIRS.LEFT;
                        setGamePhase('ready');
                        try{playPacmanStartSound();}catch(e){}
                        setTimeout(()=>setGamePhase('playing'),2000);
                    }
                },1500);
                setPacman(p=>({...p,isDying:true}));
                setGhosts(finalGhosts);
                return;
            }

            // Apply updates
            setPacman(np);
            setGhosts(finalGhosts);
            setDots(newDots); setPowerPills(newPills);
            setFrightenedTimer(newFr);
            if (sd) setScore(sc=>sc+sd);
        };

        const id=setInterval(tick,SPEED);
        return ()=>clearInterval(id);
    },[gamePhase, playPacmanStartSound]); // eslint-disable-line

    const handleRestart = useCallback(()=>initGame(),[initGame]);

    // ── Render guard ────────────────────────────────────────────────────────────
    if (!mapGrid.length||!pacman) return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
            <div className="glass-panel" style={{padding:'2rem',textAlign:'center'}}>
                <div style={{fontSize:'3rem'}}>👾</div>
                <div style={{color:'#fbbf24',marginTop:'1rem'}}>Loading Pacman...</div>
            </div>
        </div>
    );

    const cols=mapGrid[0].length, rows=mapGrid.length;
    const isDying = gamePhase==='dying';

    return (
        <div style={{
            display:'flex', justifyContent:'center', alignItems:'flex-start',
            width:'100%', height:'calc(100vh - 80px)',
            padding:'clamp(0.5rem, 1.5vw, 1rem)',
            boxSizing:'border-box', gap:'clamp(0.5rem, 1vw, 1rem)',
            overflow:'hidden', minWidth:0
        }}>
            {/* ── BOARD ──────────────────────────────────────────────────── */}
            <div style={{
                position:'relative',
                flex:'1 1 0',
                minWidth:0,
                height:'100%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                overflow:'hidden'
            }}>
            <div style={{
                position:'relative',
                height:'100%',
                maxHeight:'100%',
                aspectRatio:`${cols}/${rows}`,
                maxWidth:'100%',
                flexShrink:0
            }}>
                <div style={{
                    width:'100%', height:'100%',
                    display:'grid',
                    gridTemplateColumns:`repeat(${cols},1fr)`,
                    gridTemplateRows:`repeat(${rows},1fr)`,
                    background:'#000', borderRadius:'8px',
                    border:'4px solid #1e40af', boxSizing:'border-box'
                }}>
                    {/* Static cells */}
                    {mapGrid.map((row,y)=>row.map((cell,x)=>(
                        <div key={`c${x}${y}`} style={{
                            background: cell==='W'?'#1e3a8a': cell==='H'?'rgba(251,146,60,0.4)':'#000',
                            border: cell==='W'?'0.5px solid #1e40af':'none',
                            boxSizing:'border-box'
                        }}/>
                    )))}

                    {/* Dots */}
                    {Array.from(dots).map(k=>{const[x,y]=k.split(',').map(Number);return(
                        <div key={`d${k}`} style={{position:'absolute',width:`${100/cols}%`,height:`${100/rows}%`,
                            left:`${(x/cols)*100}%`,top:`${(y/rows)*100}%`,
                            display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                            <div style={{width:'22%',height:'22%',background:'#fbbf24',borderRadius:'50%'}}/>
                        </div>
                    );})}

                    {/* Power Pills */}
                    {Array.from(powerPills).map(k=>{const[x,y]=k.split(',').map(Number);return(
                        <div key={`p${k}`} style={{position:'absolute',width:`${100/cols}%`,height:`${100/rows}%`,
                            left:`${(x/cols)*100}%`,top:`${(y/rows)*100}%`,
                            display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                            <div style={{width:'58%',height:'58%',background:'#fbbf24',borderRadius:'50%',animation:'pacPulse 0.6s infinite alternate'}}/>
                        </div>
                    );})}

                    {/* Ghosts */}
                    {ghosts.filter(g=>g.state!=='house').map(g=>{
                        const fr=g.state==='frightened';
                        const flash=fr&&frightenedTimer<8&&frightenedTimer%2===0;
                        const c=g.state==='dead'?'transparent':flash?'#fff':fr?'#1d4ed8':g.color;
                        return(
                            <div key={g.id} style={{position:'absolute',width:`${100/cols}%`,height:`${100/rows}%`,
                                left:`${(g.x/cols)*100}%`,top:`${(g.y/rows)*100}%`,
                                display:'flex',alignItems:'center',justifyContent:'center',
                                zIndex:10,transition:'left 0.1s linear,top 0.1s linear',pointerEvents:'none'}}>
                                {g.state==='dead'
                                    ?<span style={{fontSize:`clamp(8px,${100/rows*0.7}%,24px)`,lineHeight:1}}>👀</span>
                                    :<GhostIcon width="80%" height="80%" color={c} fill={c}/>
                                }
                            </div>
                        );
                    })}

                    {/* Pacman */}
                    <div style={{position:'absolute',width:`${100/cols}%`,height:`${100/rows}%`,
                        left:`${(pacman.x/cols)*100}%`,top:`${(pacman.y/rows)*100}%`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        zIndex:11,transition: isDying?'none':'left 0.1s linear,top 0.1s linear',
                        pointerEvents:'none',
                        animation: isDying?'pacDie 1.5s forwards':undefined,
                        opacity: isDying?undefined:1}}>
                        <div style={{
                            width:'88%',height:'88%',background:'#fbbf24',borderRadius:'50%',
                            clipPath:'polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%)',
                            transform:`rotate(${pacman.dir.x===1?0:pacman.dir.y===1?90:pacman.dir.x===-1?180:-90}deg)`,
                            animation: isDying?'none':'pacmanChomp 0.25s infinite alternate'
                        }}/>
                    </div>

                    {/* Phase overlays */}
                    {gamePhase==='ready' && (
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
                            background:'rgba(0,0,0,0.6)',zIndex:20,borderRadius:'4px'}}>
                            <h2 style={{color:'#fbbf24',fontSize:'clamp(1rem,4vw,2.5rem)',animation:'pacFlash 0.7s infinite',margin:0}}>READY!</h2>
                        </div>
                    )}
                    {isDying && (
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
                            background:'rgba(0,0,0,0.5)',zIndex:22,borderRadius:'4px'}}>
                            <div style={{fontSize:'clamp(1.5rem,5vw,3rem)',animation:'pacFlash 0.3s infinite'}}>💥</div>
                        </div>
                    )}
                </div>

                {/* Game Over / Win overlay */}
                {(gamePhase==='over'||gamePhase==='won') && (
                    <div style={{position:'absolute',inset:0,background:'rgba(13,17,23,0.95)',
                        backdropFilter:'blur(8px)',display:'flex',flexDirection:'column',
                        alignItems:'center',justifyContent:'center',zIndex:100,gap:'16px',borderRadius:'8px'}}>
                        <div style={{fontSize:'clamp(3rem,8vw,5rem)'}}>{gamePhase==='won'?'🏆':'💀'}</div>
                        <h2 style={{fontSize:'clamp(1.5rem,5vw,3rem)',margin:0,color:gamePhase==='won'?'#4ade80':'#f87171'}}>
                            {gamePhase==='won'?'VICTORY!':'GAME OVER!'}
                        </h2>
                        <p style={{fontSize:'clamp(1rem,3vw,1.5rem)',color:'#fbbf24',margin:0}}>SCORE: {score}</p>
                        <div style={{display:'flex',gap:'14px',marginTop:'8px',flexWrap:'wrap',justifyContent:'center'}}>
                            <button className="btn-primary" onClick={handleRestart}
                                style={{padding:'12px 28px',display:'flex',alignItems:'center',gap:'8px'}}>
                                <RotateCcw size={18}/> Chơi Lại
                            </button>
                            <button className="btn-secondary" onClick={()=>navigate('/pacman')}
                                style={{padding:'12px 28px',display:'flex',alignItems:'center',gap:'8px'}}>
                                <ArrowLeft size={18}/> Về Sảnh
                            </button>
                        </div>
                    </div>
                )}
            </div>

            </div>
            {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
            <div style={{
                display:'flex', flexDirection:'column', gap:'clamp(0.4rem,0.8vw,0.8rem)',
                width:'clamp(150px, 18vw, 220px)',
                flexShrink:0, height:'100%', overflowY:'auto', minWidth:0
            }}>

                {/* Score & Lives */}
                <div className="glass-panel" style={{padding:'1rem',display:'flex',flexDirection:'column',gap:'0.8rem'}}>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'2px'}}>Score</div>
                        <div style={{fontSize:'1.8rem',fontWeight:800,color:'#fbbf24',lineHeight:1}}>{score}</div>
                    </div>
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:'0.8rem'}}>
                        <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.1em'}}>Lives</div>
                        <div style={{display:'flex',gap:'4px'}}>
                            {[...Array(3)].map((_,i)=>(
                                <Heart key={i} size={20} color={i<lives?'#ef4444':'#374151'} fill={i<lives?'#ef4444':'none'}/>
                            ))}
                        </div>
                    </div>
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:'0.8rem',display:'flex',flexDirection:'column',gap:'3px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.78rem'}}>
                            <span style={{color:'var(--text-secondary)'}}>Map</span>
                            <span style={{color:'var(--text-primary)',fontWeight:600}}>{mapType}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.78rem'}}>
                            <span style={{color:'var(--text-secondary)'}}>Dots</span>
                            <span style={{color:'#fbbf24',fontWeight:600}}>{dots.size}</span>
                        </div>
                    </div>
                </div>

                {/* Ghosts Status */}
                <div className="glass-panel" style={{padding:'0.8rem',display:'flex',flexDirection:'column',gap:'6px'}}>
                    <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'2px'}}>Ghosts</div>
                    {ghosts.map(g=>(
                        <div key={g.id} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.78rem'}}>
                            <GhostIcon size={14} color={g.state==='dead'?'#6b7280':g.state==='frightened'?'#1d4ed8':g.color}
                                fill={g.state==='dead'?'#6b7280':g.state==='frightened'?'#1d4ed8':g.color}/>
                            <span style={{color:'var(--text-secondary)',flex:1}}>{g.id[0]+g.id.slice(1).toLowerCase()}</span>
                            <span style={{
                                fontSize:'0.65rem',padding:'1px 5px',borderRadius:'4px',
                                background: g.state==='frightened'?'rgba(29,78,216,0.3)':g.state==='dead'?'rgba(107,114,128,0.3)':
                                            g.state==='house'?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.05)',
                                color: g.state==='frightened'?'#93c5fd':g.state==='dead'?'#9ca3af':
                                        g.state==='house'?'#6b7280':'var(--text-secondary)'
                            }}>
                                {g.state==='frightened'?'😱':g.state==='dead'?'💀':g.state==='house'?'🏠':'🎯'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Power timer */}
                {frightenedTimer>0 && (
                    <div className="glass-panel" style={{padding:'0.8rem',textAlign:'center',
                        border:'1px solid rgba(29,78,216,0.5)',background:'rgba(29,78,216,0.1)'}}>
                        <div style={{fontSize:'0.7rem',color:'#93c5fd',marginBottom:'2px'}}>⚡ POWER UP</div>
                        <div style={{fontSize:'1.4rem',fontWeight:700,color:'#60a5fa'}}>{frightenedTimer}</div>
                    </div>
                )}

                {/* Buttons */}
                <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'auto'}}>
                    <button className="btn-primary" onClick={handleRestart}
                        style={{padding:'9px',display:'flex',justifyContent:'center',alignItems:'center',gap:'6px',width:'100%',fontSize:'0.9rem'}}>
                        <RotateCcw size={15}/> Chơi Lại
                    </button>
                    <button className="btn-secondary" onClick={()=>navigate('/pacman')}
                        style={{padding:'9px',display:'flex',justifyContent:'center',alignItems:'center',gap:'6px',width:'100%',fontSize:'0.9rem'}}>
                        <ArrowLeft size={15}/> Về Sảnh
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pacmanChomp {
                    0%  { clip-path: polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%); }
                    100%{ clip-path: polygon(100% 50%, 50% 50%, 100% 50%, 100% 0, 0 0, 0 100%, 100% 100%); }
                }
                @keyframes pacDie {
                    0%  { transform: scale(1) rotate(0deg); opacity:1; }
                    50% { transform: scale(1.3) rotate(180deg); opacity:0.8; }
                    100%{ transform: scale(0) rotate(360deg); opacity:0; }
                }
                @keyframes pacFlash { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes pacPulse { 0%{transform:scale(0.8)} 100%{transform:scale(1.2)} }
            `}</style>
        </div>
    );
}
