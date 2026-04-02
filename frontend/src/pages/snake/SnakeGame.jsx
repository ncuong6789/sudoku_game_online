import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Zap } from 'lucide-react';
import { socket } from '../../utils/socket';
import { useAudio } from '../../utils/useAudio';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const INITIAL_SPEED = 180;
const MAX_SPEED = 60;
const DASH_COOLDOWN = 3000;
const DASH_DISTANCE = 3;
const DASH_MIN_LENGTH = 5;

// ─── UTILS ───────────────────────────────────────────────────────────────────
function bfsReachable(start, occupied, mapSize) {
    const q = [start], vis = new Set([`${start.x},${start.y}`]);
    const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    while (q.length) {
        const c = q.shift();
        for (const d of dirs) {
            const nx=c.x+d.x, ny=c.y+d.y, k=`${nx},${ny}`;
            if (nx>=0&&nx<mapSize&&ny>=0&&ny<mapSize&&!occupied.has(k)&&!vis.has(k)) { vis.add(k); q.push({x:nx,y:ny}); }
        }
    }
    return vis;
}

function spawnItem(snakes, deadBodies, mapSize, blockedCells) {
    const occ = new Set();
    snakes.forEach(s=>s.forEach(p=>occ.add(`${p.x},${p.y}`)));
    deadBodies.forEach(p=>occ.add(`${p.x},${p.y}`));
    if (blockedCells) blockedCells.forEach(k=>occ.add(k));
    const valid=[];
    for (let y=0;y<mapSize;y++) for (let x=0;x<mapSize;x++) if (!occ.has(`${x},${y}`)) valid.push({x,y});
    return valid.length ? valid[Math.floor(Math.random()*valid.length)] : {x:0,y:0};
}

function computeBlockedCells(g, mapSize) {
    const occ = new Set();
    g.deadBodies.forEach(b=>occ.add(`${b.x},${b.y}`));
    g.snake.forEach(s=>occ.add(`${s.x},${s.y}`));
    g.botSnake.forEach(s=>occ.add(`${s.x},${s.y}`));
    const all = new Set();
    for (let y=0;y<mapSize;y++) for (let x=0;x<mapSize;x++) if (!occ.has(`${x},${y}`)) all.add(`${x},${y}`);
    if (!all.size) return new Set();
    const first = [...all][0].split(',').map(Number);
    const reachable = bfsReachable({x:first[0],y:first[1]}, occ, mapSize);
    const blocked = new Set();
    for (const k of all) if (!reachable.has(k)) blocked.add(k);
    return blocked;
}

/** returns: 'ok'|'wall'|'cooldown'|'too_short'|'dead' */
function performDash(g, mapSize, isBot=false) {
    const snake = isBot ? g.botSnake : g.snake;
    const dir   = isBot ? g.botDirection : (g.nextDir || g.direction);
    const ck    = isBot ? 'botDashCooldownEnd' : 'dashCooldownEnd';
    const fk    = isBot ? 'botDashFlash'       : 'dashFlash';
    const now   = performance.now();
    if (g[ck] && now < g[ck]) return 'cooldown';
    if (snake.length < DASH_MIN_LENGTH)  return 'too_short';
    const h = snake[0];
    // Check path (walls + permanent dead bodies)
    for (let i=1; i<=DASH_DISTANCE; i++) {
        const nx=h.x+dir.x*i, ny=h.y+dir.y*i;
        if (nx<0||nx>=mapSize||ny<0||ny>=mapSize) return 'wall';
        if (g.deadBodies.some(b=>b.x===nx&&b.y===ny)) return 'wall';
    }
    const newHead = {x: h.x+dir.x*DASH_DISTANCE, y: h.y+dir.y*DASH_DISTANCE};
    // Check new head vs other snake
    const other = isBot ? g.snake : g.botSnake;
    if (other.length && other.some(s=>s.x===newHead.x&&s.y===newHead.y)) return 'dead';
    // Build new 4-segment snake: [h+3, h+2, h+1, h]
    const newSnake = [
        {x:h.x+dir.x*3,y:h.y+dir.y*3},
        {x:h.x+dir.x*2,y:h.y+dir.y*2},
        {x:h.x+dir.x  ,y:h.y+dir.y  },
        {x:h.x         ,y:h.y        },
    ];
    const detached = snake.slice(1); // original body → stone
    g.deadBodies = [...g.deadBodies, ...detached];
    if (isBot) { g.botSnake=newSnake; g.botScore=Math.max(0,g.botScore-detached.length); }
    else        { g.snake   =newSnake; g.score   =Math.max(0,g.score   -detached.length); }
    g[ck] = now + DASH_COOLDOWN;
    g[fk] = now + 300;
    return 'ok';
}

// ─── CANVAS ──────────────────────────────────────────────────────────────────
function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function drawEyes(ctx,cx,cy,cell,dir,color){
    const o=cell*0.22;
    let e1,e2;
    if(dir.x===1)       {e1={x:cx+o,y:cy-o};e2={x:cx+o,y:cy+o};}
    else if(dir.x===-1) {e1={x:cx-o,y:cy-o};e2={x:cx-o,y:cy+o};}
    else if(dir.y===-1) {e1={x:cx-o,y:cy-o};e2={x:cx+o,y:cy-o};}
    else                {e1={x:cx-o,y:cy+o};e2={x:cx+o,y:cy+o};}
    const r=cell*0.12;
    ctx.fillStyle=color||'#000';
    ctx.beginPath();ctx.arc(e1.x,e1.y,r,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(e2.x,e2.y,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(e1.x+r*0.3,e1.y-r*0.3,r*0.4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(e2.x+r*0.3,e2.y-r*0.3,r*0.4,0,Math.PI*2);ctx.fill();
}

function SnakeCanvas({ gameRef, mapSize }) {
    const canvasRef = useRef(null);
    const rafRef    = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const draw = (ts) => {
            rafRef.current = requestAnimationFrame(draw);
            const ctx = canvas.getContext('2d');
            const sz   = canvas.width;
            const cell = sz / mapSize;
            ctx.clearRect(0,0,sz,sz);
            ctx.fillStyle='#1a1f2e'; ctx.fillRect(0,0,sz,sz);
            // Grid
            ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=0.5;
            for(let i=0;i<=mapSize;i++){
                ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,sz);ctx.stroke();
                ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(sz,i*cell);ctx.stroke();
            }
            const g = gameRef.current;
            if (!g) return;
            const now  = performance.now();
            const elapsed = now - g.lastTickTime;
            const t = Math.min(elapsed/(g.currentSpeed||INITIAL_SPEED), 1);

            // Blocked / isolated cells
            if (g.blockedCells && g.blockedCells.size) {
                ctx.fillStyle='rgba(40,40,55,0.85)';
                for (const k of g.blockedCells) {
                    const [bx,by]=k.split(',').map(Number);
                    roundRect(ctx,bx*cell+0.5,by*cell+0.5,cell-1,cell-1,2); ctx.fill();
                }
                ctx.strokeStyle='rgba(100,100,130,0.4)'; ctx.lineWidth=0.8;
                for (const k of g.blockedCells) {
                    const [bx,by]=k.split(',').map(Number);
                    ctx.beginPath();ctx.moveTo(bx*cell+2,by*cell+2);ctx.lineTo((bx+1)*cell-2,(by+1)*cell-2);
                    ctx.moveTo((bx+1)*cell-2,by*cell+2);ctx.lineTo(bx*cell+2,(by+1)*cell-2);ctx.stroke();
                }
            }
            // Dead bodies
            ctx.fillStyle='#3f3f46';
            for(const b of g.deadBodies){
                roundRect(ctx,b.x*cell+1,b.y*cell+1,cell-2,cell-2,3); ctx.fill();
            }
            // Item (red)
            if(g.item){
                const p=0.78+0.08*Math.sin(ts/300);
                const cx=g.item.x*cell+cell/2, cy=g.item.y*cell+cell/2;
                const gr=ctx.createRadialGradient(cx,cy,cell*0.1,cx,cy,cell/2*p);
                gr.addColorStop(0,'#f87171'); gr.addColorStop(1,'#dc2626');
                ctx.shadowColor='#f87171'; ctx.shadowBlur=10;
                ctx.fillStyle=gr; ctx.beginPath();ctx.arc(cx,cy,cell/2*p,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
            }
            // Golden item
            if(g.goldenItem){
                const p2=0.85+0.1*Math.sin(ts/200);
                const cx=g.goldenItem.x*cell+cell/2, cy=g.goldenItem.y*cell+cell/2;
                ctx.shadowColor='#fbbf24'; ctx.shadowBlur=18;
                ctx.fillStyle='#fbbf24'; ctx.beginPath();ctx.arc(cx,cy,cell/2*p2,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                if(g.goldenItem.timeLeft!==undefined){
                    ctx.fillStyle='#fbbf24'; ctx.font=`bold ${Math.max(9,cell*0.55)}px sans-serif`;
                    ctx.textAlign='center'; ctx.fillText(`⏳${g.goldenItem.timeLeft}`,cx,cy-cell/2*p2-3);
                }
            }
            // Snakes
            for(const s of g.snakes){
                if(!s.positions||!s.positions.length) continue;
                const a = s.isDead ? 0.25 : 1;
                for(let i=s.positions.length-1;i>=0;i--){
                    const seg=s.positions[i], isHead=i===0;
                    let dx=seg.x*cell, dy=seg.y*cell;
                    if(isHead&&s.prevHead&&!s.isDead){
                        const ddx=seg.x-s.prevHead.x, ddy=seg.y-s.prevHead.y;
                        if(Math.abs(ddx)<=1&&Math.abs(ddy)<=1){dx=(s.prevHead.x+ddx*t)*cell;dy=(s.prevHead.y+ddy*t)*cell;}
                    }
                    if(isHead){
                        const isDashing = s.dashFlashEnd && now < s.dashFlashEnd;
                        ctx.shadowColor=s.color; ctx.shadowBlur=isDashing?25:12;
                        ctx.fillStyle='#ffffff';
                        ctx.beginPath();ctx.arc(dx+cell/2,dy+cell/2,cell*(isDashing?0.5:0.45),0,Math.PI*2);ctx.fill();
                        ctx.shadowBlur=0;
                        if(isDashing){
                            ctx.strokeStyle=s.color; ctx.lineWidth=2;
                            ctx.beginPath();ctx.arc(dx+cell/2,dy+cell/2,cell*0.55,0,Math.PI*2);ctx.stroke();
                        }
                        drawEyes(ctx,dx+cell/2,dy+cell/2,cell,s.direction||{x:1,y:0},s.color);
                    } else {
                        const len=s.positions.length;
                        const fs=len>=8?0.25:(len>=4?0.1:0);
                        const ff=1-(i/Math.max(len,8))*fs;
                        ctx.globalAlpha=a*ff; ctx.fillStyle=s.color;
                        roundRect(ctx,dx+1,dy+1,cell-2,cell-2,Math.max(2,cell*0.25)); ctx.fill();
                        ctx.globalAlpha=a;
                    }
                }
            }
            ctx.globalAlpha=1;
        };
        rafRef.current=requestAnimationFrame(draw);
        return ()=>cancelAnimationFrame(rafRef.current);
    },[mapSize,gameRef]);

    return <canvas ref={canvasRef} width={600} height={600} style={{width:'100%',height:'100%',display:'block',imageRendering:'pixelated'}} />;
}

// ─── INFO PANEL ───────────────────────────────────────────────────────────────
function InfoPanel({ gameRef }) {
    const [cdRemain, setCdRemain] = useState(0);
    useEffect(() => {
        const t = setInterval(() => {
            const end = gameRef.current?.dashCooldownEnd || 0;
            setCdRemain(Math.max(0, end - performance.now()));
        }, 100);
        return () => clearInterval(t);
    }, [gameRef]);

    const ready = cdRemain <= 0;
    const pct = ready ? 1 : 1 - cdRemain / DASH_COOLDOWN;
    const accentGreen = '#4ade80';

    const cardStyle = {
        borderRadius:'10px', padding:'10px 12px',
        background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.08)',
        marginBottom:'8px'
    };
    const labelStyle = { fontSize:'0.75rem', color:'#94a3b8', marginBottom:'6px', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' };
    const rowStyle   = { display:'flex', alignItems:'center', gap:'8px', fontSize:'0.82rem', color:'#cbd5e1', marginBottom:'4px' };

    return (
        <div style={{ width:'210px', flexShrink:0, display:'flex', flexDirection:'column', paddingLeft:'12px', overflowY:'auto', maxHeight:'70vh' }}>

            {/* DASH */}
            <div style={{...cardStyle, border:`1px solid ${ready?'rgba(250,204,21,0.4)':'rgba(255,255,255,0.08)'}`}}>
                <div style={{...labelStyle, color: ready?'#fbbf24':'#94a3b8'}}>
                    ⚡ Lao Nhanh — SPACE
                </div>
                {/* Cooldown bar */}
                <div style={{ background:'#1e293b', borderRadius:'6px', height:'8px', overflow:'hidden', marginBottom:'8px' }}>
                    <div style={{
                        height:'100%', width:`${pct*100}%`,
                        background: ready ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                        borderRadius:'6px', transition:'width 0.1s'
                    }}/>
                </div>
                <div style={{ textAlign:'center', fontSize:'0.78rem', color: ready ? '#4ade80' : '#f59e0b', fontWeight:700, marginBottom:'8px' }}>
                    {ready ? '✓ SẴN SÀNG' : `Hồi chiêu ${(cdRemain/1000).toFixed(1)}s`}
                </div>
                <div style={rowStyle}><span style={{color:'#fbbf24'}}>➤</span> Đầu rắn lao <b style={{color:'#fff'}}>3 ô</b> về phía trước</div>
                <div style={rowStyle}><span style={{color:'#f87171'}}>☠</span> Đuôi bỏ lại → hóa <b style={{color:'#9ca3af'}}>đá cản</b></div>
                <div style={rowStyle}><span style={{color:'#f87171'}}>—</span> Điểm trừ = số đốt mất</div>
                <div style={rowStyle}><span style={{color:'#94a3b8'}}>!</span> Cần ≥ <b style={{color:'#fff'}}>5 đốt</b> để dùng</div>
                <div style={rowStyle}><span style={{color:'#60a5fa'}}>⏱</span> Hồi chiêu <b style={{color:'#fff'}}>3 giây</b></div>
            </div>

            {/* ITEMS */}
            <div style={cardStyle}>
                <div style={labelStyle}>🎯 Vật Phẩm</div>
                <div style={{...rowStyle, background:'rgba(239,68,68,0.08)', borderRadius:'6px', padding:'6px 8px', marginBottom:'6px'}}>
                    <div style={{width:14,height:14,borderRadius:'50%',background:'radial-gradient(circle,#f87171,#dc2626)',boxShadow:'0 0 6px #f87171',flexShrink:0}}/>
                    <div>
                        <div style={{color:'#f87171',fontWeight:700,fontSize:'0.82rem'}}>Mồi Đỏ — +1 điểm</div>
                        <div style={{color:'#94a3b8',fontSize:'0.75rem'}}>Rắn dài thêm 1 đốt</div>
                    </div>
                </div>
                <div style={{...rowStyle, background:'rgba(251,191,36,0.08)', borderRadius:'6px', padding:'6px 8px'}}>
                    <div style={{width:14,height:14,borderRadius:'50%',background:'radial-gradient(circle,#fbbf24,#d97706)',boxShadow:'0 0 8px #fbbf24',flexShrink:0}}/>
                    <div>
                        <div style={{color:'#fbbf24',fontWeight:700,fontSize:'0.82rem'}}>Mồi Vàng — +2 điểm</div>
                        <div style={{color:'#94a3b8',fontSize:'0.75rem'}}>✂ Rút ngắn 2 đốt đuôi</div>
                        <div style={{color:'#94a3b8',fontSize:'0.75rem'}}>⏳ Biến mất sau 5 giây</div>
                        <div style={{color:'#94a3b8',fontSize:'0.75rem'}}>🐢 Rắn đi chậm hơn</div>
                    </div>
                </div>
            </div>

            {/* CONTROLS */}
            <div style={cardStyle}>
                <div style={labelStyle}>🎮 Điều Khiển</div>
                <div style={rowStyle}><kbd style={{background:'#1e293b',border:'1px solid #334155',borderRadius:'4px',padding:'1px 6px',fontSize:'0.75rem'}}>↑↓←→</kbd> Di chuyển</div>
                <div style={rowStyle}><kbd style={{background:'#1e293b',border:'1px solid #334155',borderRadius:'4px',padding:'1px 6px',fontSize:'0.75rem'}}>SPACE</kbd> Lao nhanh</div>
            </div>

            {/* MAP NOTE */}
            <div style={cardStyle}>
                <div style={labelStyle}>🗺 Ký Hiệu Bản Đồ</div>
                <div style={rowStyle}>
                    <div style={{width:14,height:14,background:'#3f3f46',borderRadius:'2px',flexShrink:0}}/>
                    Xác rắn — vật cản
                </div>
                <div style={rowStyle}>
                    <div style={{position:'relative',width:14,height:14,background:'rgba(40,40,55,0.85)',borderRadius:'2px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:'9px',color:'rgba(100,100,130,0.8)',lineHeight:1}}>✕</span>
                    </div>
                    Ô cô lập — không có mồi
                </div>
            </div>
        </div>
    );
}

// ─── MAIN GAME ───────────────────────────────────────────────────────────────
export default function SnakeGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, mapSize, roomId, playerColor, difficulty, hasBot } =
        location.state || { mode:'solo', mapSize:20, roomId:null, difficulty:'Medium', hasBot:false };
    const { playWinSound, playLoseSound } = useAudio();

    const gameRef  = useRef(null);
    const [uiState, setUiState] = useState({ score:0, botScore:0, gameOver:false, statusMessage:'Đang chơi...' });
    const [gameState,  setGameState]  = useState(null);
    const [countdown,  setCountdown]  = useState(mode==='multiplayer' ? 3 : null);
    const [showArrow,  setShowArrow]  = useState(true);
    const myColor     = playerColor==='green' ? '#4ade80' : '#60a5fa';
    const myColorLabel= playerColor==='green' ? 'Xanh'  : 'Lam';

    // A*
    const astar = useCallback((start,target,occ,ms) => {
        const open=[{...start,g:0,h:Math.abs(start.x-target.x)+Math.abs(start.y-target.y),p:null}];
        const closed=new Set();
        while(open.length){
            open.sort((a,b)=>(a.g+a.h)-(b.g+b.h));
            const c=open.shift(), k=`${c.x},${c.y}`;
            if(c.x===target.x&&c.y===target.y){
                const path=[];let t=c;while(t.p){path.push({x:t.x-t.p.x,y:t.y-t.p.y});t=t.p;}return path.reverse();
            }
            closed.add(k);
            for(const d of [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}]){
                const nx=c.x+d.x,ny=c.y+d.y,nk=`${nx},${ny}`;
                if(nx>=0&&nx<ms&&ny>=0&&ny<ms&&!occ.has(nk)&&!closed.has(nk)){
                    const g2=c.g+1,h2=Math.abs(nx-target.x)+Math.abs(ny-target.y);
                    const ex=open.find(o=>o.x===nx&&o.y===ny);
                    if(!ex)open.push({x:nx,y:ny,g:g2,h:h2,p:c});else if(g2<ex.g){ex.g=g2;ex.p=c;}
                }
            }
        } return null;
    },[]);

    function buildSnakeList(g) {
        const now=performance.now();
        const list=[];
        if(g.snake.length) list.push({ id:'me', positions:g.snake, prevHead:g.prevHeadPlayer, color:'#4ade80', direction:g.direction, isDead:false, isMe:true, dashFlashEnd:g.dashFlash });
        if(hasBot&&g.botSnake.length) list.push({ id:'bot', positions:g.botSnake, prevHead:g.prevHeadBot, color:'#60a5fa', direction:g.botDirection, isDead:false, isMe:false, dashFlashEnd:g.botDashFlash });
        return list;
    }

    const initGame = useCallback(() => {
        const sx=Math.max(2,Math.floor(mapSize/4)), sy=Math.floor(mapSize/4);
        const bx=Math.min(mapSize-3,Math.floor(mapSize*3/4)), by=Math.floor(mapSize*3/4);
        const g = {
            snake:[{x:sx,y:sy},{x:sx-1,y:sy}],
            botSnake:hasBot?[{x:bx,y:by},{x:bx+1,y:by}]:[],
            direction:{x:1,y:0}, botDirection:{x:-1,y:0}, nextDir:{x:1,y:0},
            item:{x:Math.floor(mapSize/2),y:Math.floor(mapSize/2)},
            goldenItem:null, deadBodies:[], blockedCells:new Set(),
            score:0, botScore:0, gameOver:false, botDead:false,
            statusMessage:'Đang chơi...', currentSpeed:INITIAL_SPEED,
            lastTickTime:performance.now(), snakes:[],
            prevHeadPlayer:null, prevHeadBot:null,
            dashCooldownEnd:null, botDashCooldownEnd:null,
            dashFlash:null, botDashFlash:null,
        };
        g.snakes=buildSnakeList(g);
        gameRef.current=g;
    },[mapSize,hasBot]);

    useEffect(()=>{ initGame(); },[initGame]);
    useEffect(()=>{ const t=setTimeout(()=>setShowArrow(false),3000); return()=>clearTimeout(t); },[uiState.gameOver]);

    // Keyboard (arrows + space)
    useEffect(()=>{
        const onKey=(e)=>{
            if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' '].includes(e.key)||e.code==='Space') e.preventDefault();
            const g=gameRef.current; if(!g||g.gameOver) return;
            const nd=g.nextDir;
            if(e.key==='ArrowUp'&&nd.y===0)   g.nextDir={x:0,y:-1};
            if(e.key==='ArrowDown'&&nd.y===0)  g.nextDir={x:0,y:1};
            if(e.key==='ArrowLeft'&&nd.x===0)  g.nextDir={x:-1,y:0};
            if(e.key==='ArrowRight'&&nd.x===0) g.nextDir={x:1,y:0};
            if(e.code==='Space'||e.key===' '){
                const res=performDash(g,mapSize,false);
                if(res==='ok'){
                    g.blockedCells=computeBlockedCells(g,mapSize);
                    g.snakes=buildSnakeList(g);
                    setUiState(p=>({...p,score:g.score}));
                }
                if(res==='dead'){
                    g.deadBodies=[...g.deadBodies,...g.snake];
                    g.snake=[]; g.gameOver=true;
                    const msg=`Game Over! Điểm: ${g.score}`;
                    g.statusMessage=msg; g.snakes=[];
                    setUiState({score:g.score,botScore:g.botScore,gameOver:true,statusMessage:msg});
                    playLoseSound();
                }
            }
            if(mode==='multiplayer'&&roomId) socket.emit('snakeChangeDirection',{roomId,direction:g.nextDir});
        };
        window.addEventListener('keydown',onKey);
        return()=>window.removeEventListener('keydown',onKey);
    },[mode,roomId,mapSize,playLoseSound]);

    // Game loop
    useEffect(()=>{
        if(mode!=='solo') return;
        const tick=()=>{
            const g=gameRef.current;
            if(!g||g.gameOver) return;
            g.prevHeadPlayer=g.snake[0]?{...g.snake[0]}:null;
            g.prevHeadBot   =g.botSnake[0]?{...g.botSnake[0]}:null;
            g.lastTickTime  =performance.now();
            g.currentSpeed  =Math.max(MAX_SPEED,INITIAL_SPEED-g.score*5)*(g.goldenItem ? 1.3 : 1);

            const pDir=g.nextDir, h=g.snake[0];
            const pnx=h.x+pDir.x, pny=h.y+pDir.y;

            // Bot AI
            let bnx=null,bny=null,newBHead=null,bDir=g.botDirection;
            if(hasBot&&!g.botDead&&g.botSnake.length>0){
                const bh=g.botSnake[0];
                const obs=new Set();
                g.snake.forEach(p=>obs.add(`${p.x},${p.y}`));
                obs.add(`${pnx},${pny}`);
                g.botSnake.slice(0,-1).forEach(p=>obs.add(`${p.x},${p.y}`));
                g.deadBodies.forEach(p=>obs.add(`${p.x},${p.y}`));
                const tgt=g.goldenItem||g.item;
                let path=astar(bh,tgt,obs,mapSize);
                if(difficulty==='Easy'&&Math.random()<0.4)   path=null;
                if(difficulty==='Medium'&&Math.random()<0.1) path=null;
                if(path?.length) bDir=path[0];
                else {
                    const tail=g.botSnake[g.botSnake.length-1];
                    path=astar(bh,tail,obs,mapSize);
                    if(path?.length) bDir=path[0];
                    else {
                        const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                        const neck=g.botSnake.length>1?g.botSnake[1]:null;
                        const valids=dirs.filter(d=>{
                            const nx=bh.x+d.x,ny=bh.y+d.y;
                            if(neck&&nx===neck.x&&ny===neck.y) return false;
                            return nx>=0&&nx<mapSize&&ny>=0&&ny<mapSize&&!obs.has(`${nx},${ny}`);
                        });
                        // Bot dash if trapped
                        if(valids.length===0&&g.botSnake.length>=DASH_MIN_LENGTH){
                            performDash(g,mapSize,true);
                            g.blockedCells=computeBlockedCells(g,mapSize);
                        } else if(valids.length>0) bDir=valids[Math.floor(Math.random()*valids.length)];
                    }
                }
                // Bot considers dash to dodge player head
                if(!g.botDashCooldownEnd||performance.now()>g.botDashCooldownEnd){
                    const nextBotHead={x:bh.x+bDir.x,y:bh.y+bDir.y};
                    if(nextBotHead.x===pnx&&nextBotHead.y===pny&&g.botSnake.length>=DASH_MIN_LENGTH){
                        performDash(g,mapSize,true);
                        g.blockedCells=computeBlockedCells(g,mapSize);
                    }
                }
                if(g.botSnake.length>0){
                    bnx=g.botSnake[0].x+bDir.x; bny=g.botSnake[0].y+bDir.y;
                    newBHead={x:bnx,y:bny};
                }
            }

            // Collisions
            let pDied=false, bDied=false;
            if(g.snake.length>0){
                if(pnx<0||pnx>=mapSize||pny<0||pny>=mapSize||
                   g.snake.some((s,i)=>i!==g.snake.length-1&&s.x===pnx&&s.y===pny)||
                   g.deadBodies.some(b=>b.x===pnx&&b.y===pny)) pDied=true;
            }
            if(hasBot&&!g.botDead&&g.botSnake.length>0&&newBHead){
                if(bnx<0||bnx>=mapSize||bny<0||bny>=mapSize||
                   g.botSnake.some((s,i)=>i!==g.botSnake.length-1&&s.x===bnx&&s.y===bny)||
                   g.snake.some(s=>s.x===bnx&&s.y===bny)||
                   g.deadBodies.some(b=>b.x===bnx&&b.y===bny)) bDied=true;
                if(pnx===bnx&&pny===bny){pDied=true;bDied=true;}
                if(g.botSnake.some(s=>s.x===pnx&&s.y===pny)) pDied=true;
                if(g.snake.some(s=>s.x===bnx&&s.y===bny))     bDied=true;
            }

            // Handle bot death (game continues!)
            if(bDied&&!g.botDead){
                g.deadBodies=[...g.deadBodies,...g.botSnake];
                g.botSnake=[]; g.botDead=true;
                g.blockedCells=computeBlockedCells(g,mapSize);
            }

            // Handle player death → now compare scores
            if(pDied){
                g.deadBodies=[...g.deadBodies,...g.snake];
                g.snake=[]; g.gameOver=true;
                let msg;
                if(hasBot){
                    if(!g.botDead&&bDied) {
                        // both die same frame
                        msg = g.score>g.botScore?`CHIẾN THẮNG! (Bạn:${g.score} - Bot:${g.botScore})`
                            : g.score<g.botScore?`THẤT BẠI! (Bạn:${g.score} - Bot:${g.botScore})`
                            : `HÒA! (Cùng ${g.score} điểm)`;
                    } else if(g.botDead){
                        msg = g.score>g.botScore?`CHIẾN THẮNG! (Bạn:${g.score} - Bot:${g.botScore})`
                            : g.score<g.botScore?`THẤT BẠI! (Bạn:${g.score} - Bot:${g.botScore})`
                            : `HÒA! (Cùng ${g.score} điểm)`;
                    } else {
                        msg=`THẤT BẠI! (Bạn:${g.score} - Bot:${g.botScore})`;
                    }
                    if(msg.includes('THẮNG')) playWinSound(); else if(msg.includes('THẤT')) playLoseSound();
                } else {
                    msg=`Game Over! Điểm: ${g.score}`; playLoseSound();
                }
                g.statusMessage=msg; g.snakes=buildSnakeList(g);
                setUiState({score:g.score,botScore:g.botScore,gameOver:true,statusMessage:msg});
                return;
            }

            // Move player
            const newPHead={x:pnx,y:pny};
            let newP=[newPHead,...g.snake];
            let newItem=g.item, newGold=g.goldenItem, newScore=g.score;
            if(pnx===newItem.x&&pny===newItem.y){
                newScore++;
                newP.push({...g.snake[g.snake.length-1]});
                newItem=spawnItem([newP,g.botSnake],g.deadBodies,mapSize,g.blockedCells);
                if(Math.random()<0.15&&!newGold) newGold={...spawnItem([newP,g.botSnake],g.deadBodies,mapSize,g.blockedCells),timeLeft:5};
            } else if(newGold&&pnx===newGold.x&&pny===newGold.y){
                newScore+=2; newGold=null;
                newP.pop(); if(newP.length>2) newP.pop();
            } else { newP.pop(); }

            // Move bot
            if(hasBot&&!g.botDead&&g.botSnake.length>0&&newBHead&&!bDied){
                let newB=[newBHead,...g.botSnake];
                let newBScore=g.botScore;
                if(bnx===newItem.x&&bny===newItem.y){
                    newBScore++; newB.push({...g.botSnake[g.botSnake.length-1]});
                    newItem=spawnItem([newP,newB],g.deadBodies,mapSize,g.blockedCells);
                } else if(newGold&&bnx===newGold.x&&bny===newGold.y){
                    newBScore+=2; newGold=null; newB.pop();
                } else { newB.pop(); }
                g.botDirection=bDir; g.botSnake=newB; g.botScore=newBScore;
            }

            g.direction=pDir; g.nextDir=pDir; g.snake=newP;
            g.score=newScore; g.item=newItem; g.goldenItem=newGold;
            g.snakes=buildSnakeList(g);

            setUiState(p=>{
                if(p.score!==g.score||p.botScore!==g.botScore)
                    return{...p,score:g.score,botScore:g.botScore};
                return p;
            });
        };
        const id=setInterval(tick,INITIAL_SPEED);
        return()=>clearInterval(id);
    },[mode,hasBot,difficulty,mapSize,astar,playWinSound,playLoseSound]);

    // Golden item countdown
    useEffect(()=>{
        if(mode!=='solo') return;
        const t=setInterval(()=>{
            if(gameRef.current?.goldenItem){
                const gi=gameRef.current.goldenItem;
                gameRef.current.goldenItem=gi.timeLeft<=1?null:{...gi,timeLeft:gi.timeLeft-1};
            }
        },1000);
        return()=>clearInterval(t);
    },[mode]);

    // Countdown
    useEffect(()=>{
        if(mode!=='multiplayer'||countdown===null||countdown<=0) return;
        const t=setTimeout(()=>setCountdown(c=>c-1),1000);
        return()=>clearTimeout(t);
    },[countdown,mode]);
    useEffect(()=>{ if(countdown===0){const t=setTimeout(()=>setCountdown(null),800);return()=>clearTimeout(t);} },[countdown]);

    // Multiplayer
    useEffect(()=>{
        if(mode!=='multiplayer'||!roomId) return;
        socket.on('snakeGameState',(state)=>{
            setGameState(state);
            if(state.status==='finished'){
                const my=state.snakes[socket.id];
                const op=Object.values(state.snakes).find(s=>s.id!==socket.id);
                let msg='Game Over';
                if(my?.isDead&&op?.isDead){msg=my.score>op.score?'Bạn Thắng!':my.score<op.score?'Bạn Thua!':'Hòa!';if(my.score>op.score)playWinSound();else playLoseSound();}
                else if(my?.isDead){msg='Bạn TỬ NẠN!';playLoseSound();}
                else if(op?.isDead){msg='Đối thủ chết! THẮNG!';playWinSound();}
                setUiState(p=>({...p,gameOver:true,statusMessage:msg}));
            }
        });
        socket.on('opponentDisconnected',()=>{setUiState(p=>p.gameOver?p:{...p,gameOver:true,statusMessage:'Bạn Thắng! Đối thủ thoát.'});playWinSound();});
        return()=>{socket.off('snakeGameState');socket.off('opponentDisconnected');};
    },[mode,roomId,playWinSound,playLoseSound]);
    useEffect(()=>()=>{if(roomId)socket.emit('leaveRoom',roomId);},[roomId]);

    const handleRestart=()=>{ initGame(); setUiState({score:0,botScore:0,gameOver:false,statusMessage:'Đang chơi...'}); setShowArrow(true); };

    // Multiplayer canvas data
    const mpRef = useRef(null);
    if(mode==='multiplayer'&&gameState){
        mpRef.current={
            snakes:Object.values(gameState.snakes).map(s=>({id:s.id,positions:s.positions,prevHead:null,color:s.color==='green'?'#4ade80':'#60a5fa',direction:s.direction||{x:1,y:0},isDead:s.isDead,isMe:s.id===socket.id,dashFlashEnd:null})),
            deadBodies:gameState.deadBodies||[],item:gameState.item||{x:-10,y:-10},goldenItem:gameState.goldenItem||null,
            blockedCells:new Set(),currentSpeed:INITIAL_SPEED,lastTickTime:performance.now(),
        };
    }
    const canvasRef2use = mode==='multiplayer'?mpRef:gameRef;
    const oppScore = mode==='solo'?uiState.botScore:(gameState?Object.values(gameState.snakes).find(s=>s.id!==socket.id)?.score??0:0);

    // Game over display
    const isWin=uiState.statusMessage.includes('THẮNG')||uiState.statusMessage.includes('Thắng');
    const isDraw=uiState.statusMessage.includes('HÒA')||uiState.statusMessage.includes('Hòa');
    const accentColor=isWin?'#4ade80':isDraw?'#fbbf24':'#f87171';
    const resultEmoji=isWin?'🏆':isDraw?'🤝':'💀';
    const resultTitle=uiState.statusMessage.split('!')[0]+'!';
    const resultDetail=uiState.statusMessage.includes('(')?uiState.statusMessage.split('(')[1]?.replace(')',''):uiState.statusMessage.split('!').slice(1).join('!').trim();

    return (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:'100%',padding:'0 1rem'}}>
            <div className="glass-panel" style={{position:'relative',overflow:'hidden',width:'100%',maxWidth:'1020px',display:'flex',flexDirection:'column',padding:'1.5rem'}}>

                {/* Header */}
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.8rem',alignItems:'center',flexWrap:'nowrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.6rem',minWidth:0}}>
                        <div className="nav-item active" style={{padding:'6px 12px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                            <Activity size={16}/> Snake {mapSize}
                        </div>
                        <span style={{fontSize:'0.85rem',color:'var(--text-secondary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {mode==='solo'?`vs Bot AI (${difficulty})`:`${roomId}`}
                        </span>
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                        {mode==='solo'&&<button className="btn-secondary" onClick={handleRestart} style={{padding:'6px 12px',display:'flex',alignItems:'center',gap:'5px',width:'auto',whiteSpace:'nowrap',fontSize:'0.9rem'}}><RotateCcw size={14}/>Chơi lại</button>}
                        <button className="btn-secondary" onClick={()=>navigate(mode==='multiplayer'?'/snake/multiplayer':'/snake')} style={{padding:'6px 12px',display:'flex',alignItems:'center',gap:'5px',width:'auto',whiteSpace:'nowrap',fontSize:'0.9rem'}}><ArrowLeft size={14}/>Thoát</button>
                    </div>
                </div>

                {/* Status */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.8rem',background:'rgba(0,0,0,0.2)',padding:'0.8rem 1rem',borderRadius:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'1.5rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'0.8rem'}}>
                            <Trophy size={18} color="#fbbf24"/>
                            <span style={{fontSize:'1.1rem',fontWeight:'bold'}}>Bạn: <span style={{color:'#4ade80'}}>{uiState.score}</span></span>
                        </div>
                        {(hasBot||mode==='multiplayer')&&(
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#60a5fa'}}/>
                                <span style={{fontSize:'1.1rem',fontWeight:'bold'}}>{mode==='solo'?`Bot (${difficulty})`:'Địch'}: <span style={{color:'#60a5fa'}}>{oppScore}</span></span>
                            </div>
                        )}
                    </div>
                    {hasBot&&gameRef.current?.botDead&&!uiState.gameOver&&(
                        <span style={{fontSize:'0.85rem',color:'#f59e0b',fontWeight:600}}>💀 Bot đã chết — tiếp tục ghi điểm!</span>
                    )}
                    <span style={{fontWeight:'bold',fontSize:'0.9rem',color:uiState.gameOver?'var(--error-color)':'var(--text-primary)'}}>
                        {uiState.statusMessage}
                    </span>
                </div>

                {/* Main area: board + sidebar */}
                <div style={{display:'flex',flexDirection:'row',alignItems:'flex-start',gap:0}}>
                    {/* Board */}
                    <div style={{flex:1,minWidth:0}}>
                        <div style={{
                            position:'relative',width:'100%',maxWidth:'65vh',aspectRatio:'1/1',
                            border:'4px solid rgba(255,255,255,0.1)',borderRadius:'8px',
                            boxShadow:'inset 0 0 20px rgba(0,0,0,0.5),0 10px 30px rgba(0,0,0,0.3)',
                            overflow:'hidden',margin:'0 auto'
                        }}>
                            <SnakeCanvas gameRef={canvasRef2use} mapSize={mapSize}/>
                            {mode==='multiplayer'&&countdown!==null&&(
                                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:60,gap:'16px'}}>
                                    <p style={{margin:0,fontSize:'0.95rem',color:'var(--text-secondary)'}}>Rắn của bạn:</p>
                                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                        <div style={{width:'20px',height:'20px',borderRadius:'50%',background:myColor,boxShadow:`0 0 10px ${myColor}`}}/>
                                        <span style={{fontWeight:700,fontSize:'1.2rem',color:myColor}}>{myColorLabel}</span>
                                    </div>
                                    <div style={{fontSize:countdown===0?'2.5rem':'6rem',fontWeight:900,color:countdown===0?'#4ade80':'#fff',textShadow:'0 0 20px currentColor',transition:'all 0.3s'}}>
                                        {countdown===0?'BẮT ĐẦU!':countdown}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Game over banner */}
                        {uiState.gameOver&&(
                            <div style={{marginTop:'1rem',borderRadius:'12px',border:`2px solid ${accentColor}44`,background:`linear-gradient(135deg,${accentColor}12,rgba(13,17,23,0.8))`,padding:'1rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                                    <span style={{fontSize:'2.2rem',lineHeight:1}}>{resultEmoji}</span>
                                    <div>
                                        <div style={{fontSize:'1.3rem',fontWeight:900,color:accentColor,lineHeight:1.2}}>{resultTitle}</div>
                                        {resultDetail&&<div style={{fontSize:'0.9rem',color:'var(--text-secondary)',marginTop:'4px'}}>{resultDetail}</div>}
                                    </div>
                                </div>
                                <div style={{display:'flex',gap:'10px',flexShrink:0}}>
                                    {mode==='solo'&&<button className="btn-primary" onClick={handleRestart} style={{padding:'10px 22px',fontSize:'1rem',display:'flex',alignItems:'center',gap:'8px'}}><RotateCcw size={18}/>Chơi lại</button>}
                                    <button className="btn-secondary" onClick={()=>navigate(mode==='multiplayer'?'/snake/multiplayer':'/snake')} style={{padding:'10px 22px',fontSize:'1rem',display:'flex',alignItems:'center',gap:'8px'}}><ArrowLeft size={18}/>Thoát</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Sidebar info panel */}
                    {mode==='solo'&&<InfoPanel gameRef={gameRef}/>}
                </div>
            </div>
        </div>
    );
}
