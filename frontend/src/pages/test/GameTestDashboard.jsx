import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle, XCircle, Clock, Wifi, WifiOff, Database, Server, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ─── Test Runner Helpers ──────────────────────────────────────────────────────

async function runTest(name, fn) {
    const start = performance.now();
    try {
        await fn();
        return { name, status: 'pass', duration: Math.round(performance.now() - start) };
    } catch (err) {
        return { name, status: 'fail', error: err.message, duration: Math.round(performance.now() - start) };
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
    if (a !== b) throw new Error(message || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Game Logic Imports ───────────────────────────────────────────────────────

let pikachuModule = null;
let caroModule = null;
let sudokuModule = null;

async function loadModules() {
    const [pika, caro, sudoku] = await Promise.allSettled([
        import('../pages/pikachu/usePikachuLogic'),
        import('../pages/caro/caroAI'),
        import('../utils/sudoku'),
    ]);
    if (pika.status === 'fulfilled') pikachuModule = pika.value;
    if (caro.status === 'fulfilled') caroModule = caro.value;
    if (sudoku.status === 'fulfilled') sudokuModule = sudoku.value;
}

// ─── Test Suites Definition ───────────────────────────────────────────────────

const ROWS = 16, COLS = 16, R = ROWS + 2, C = COLS + 2;

function emptyPikachuBoard() {
    return Array.from({ length: R }, () => Array(C).fill(0));
}

function emptyCaroBoard(size = 15) {
    return Array.from({ length: size }, () => Array(size).fill(0));
}

const TEST_SUITES = [
    {
        id: 'pikachu',
        name: '🎮 Pikachu Logic',
        color: '#f59e0b',
        tests: [
            {
                name: 'generateInitialBoard — correct size',
                fn: () => {
                    const b = pikachuModule.generateInitialBoard();
                    assert(b.length === R, `rows: ${b.length} !== ${R}`);
                    assert(b[0].length === C, `cols: ${b[0].length} !== ${C}`);
                }
            },
            {
                name: 'generateInitialBoard — ROWS*COLS tiles',
                fn: () => {
                    const b = pikachuModule.generateInitialBoard();
                    const count = b.flat().filter(v => v !== 0).length;
                    assertEqual(count, ROWS * COLS, `tile count: ${count}`);
                }
            },
            {
                name: 'generateInitialBoard — all values in pairs',
                fn: () => {
                    const b = pikachuModule.generateInitialBoard();
                    const freq = {};
                    b.flat().forEach(v => { if (v !== 0) freq[v] = (freq[v] || 0) + 1; });
                    Object.entries(freq).forEach(([k, n]) => {
                        assert(n % 2 === 0, `value ${k} appears ${n} times (not even)`);
                    });
                }
            },
            {
                name: 'generateInitialBoard — boundary stays zero',
                fn: () => {
                    const b = pikachuModule.generateInitialBoard();
                    for (let c = 0; c < C; c++) {
                        assert(b[0][c] === 0, `boundary row 0 col ${c} not zero`);
                        assert(b[R-1][c] === 0, `boundary row ${R-1} col ${c} not zero`);
                    }
                }
            },
            {
                name: 'findPath — null for same tile',
                fn: () => {
                    let b = emptyPikachuBoard(); b[1][1] = 5;
                    const result = pikachuModule.findPath(b, { r: 1, c: 1 }, { r: 1, c: 1 });
                    assert(result === null, 'should be null for same cell');
                }
            },
            {
                name: 'findPath — null for different values',
                fn: () => {
                    let b = emptyPikachuBoard(); b[1][1] = 5; b[1][3] = 7;
                    const result = pikachuModule.findPath(b, { r: 1, c: 1 }, { r: 1, c: 3 });
                    assert(result === null, 'should be null for different values');
                }
            },
            {
                name: 'findPath — finds same-row path',
                fn: () => {
                    let b = emptyPikachuBoard(); b[2][1] = 3; b[2][4] = 3;
                    const path = pikachuModule.findPath(b, { r: 2, c: 1 }, { r: 2, c: 4 });
                    assert(path !== null, 'should find direct row path');
                }
            },
            {
                name: 'findPath — finds same-column path',
                fn: () => {
                    let b = emptyPikachuBoard(); b[1][4] = 9; b[5][4] = 9;
                    const path = pikachuModule.findPath(b, { r: 1, c: 4 }, { r: 5, c: 4 });
                    assert(path !== null, 'should find direct column path');
                }
            },
            {
                name: 'findPath — finds L-shaped path (1 turn)',
                fn: () => {
                    let b = emptyPikachuBoard(); b[1][1] = 11; b[3][3] = 11;
                    const path = pikachuModule.findPath(b, { r: 1, c: 1 }, { r: 3, c: 3 });
                    assert(path !== null, 'should find L-shape path');
                    assertEqual(path.length, 3, `path length should be 3 for L-shape, got ${path.length}`);
                }
            },
            {
                name: 'hasValidPair — "win" for empty board',
                fn: () => {
                    const result = pikachuModule.hasValidPair(emptyPikachuBoard());
                    assertEqual(result, 'win', 'empty board should return "win"');
                }
            },
            {
                name: 'hasValidPair — finds pair on simple board',
                fn: () => {
                    let b = emptyPikachuBoard(); b[1][1] = 5; b[1][3] = 5;
                    const result = pikachuModule.hasValidPair(b);
                    assert(result !== null && result !== 'win', 'should find a valid pair');
                    assert(Array.isArray(result), 'result should be array [p1, p2]');
                }
            },
            {
                name: 'shuffleBoard — preserves tile count',
                fn: () => {
                    let b = emptyPikachuBoard();
                    b[1][1] = 5; b[2][2] = 5; b[3][3] = 7; b[4][4] = 7;
                    const count = (board) => board.flat().filter(v => v !== 0).length;
                    assertEqual(count(pikachuModule.shuffleBoard(b)), count(b), 'tile count should be same after shuffle');
                }
            },
            {
                name: 'applyLevelMovement — removes matched tiles (Static)',
                fn: () => {
                    let b = emptyPikachuBoard(); b[5][1] = 9; b[5][3] = 9;
                    const result = pikachuModule.applyLevelMovement(b, { r: 5, c: 1 }, { r: 5, c: 3 }, 1);
                    assertEqual(result[5][1], 0, 'tile at p1 should be 0');
                    assertEqual(result[5][3], 0, 'tile at p2 should be 0');
                }
            },
        ]
    },
    {
        id: 'caro',
        name: '⚔️ Caro Logic',
        color: '#8b5cf6',
        tests: [
            {
                name: 'checkWinner — null on empty board',
                fn: () => {
                    const b = emptyCaroBoard();
                    assert(caroModule.checkWinner(b, 7, 7, 1, 15) === null, 'empty board should not have winner');
                }
            },
            {
                name: 'checkWinner — detects horizontal 5-in-a-row',
                fn: () => {
                    const b = emptyCaroBoard();
                    [3, 4, 5, 6, 7].forEach(c => b[5][c] = 1);
                    const result = caroModule.checkWinner(b, 5, 5, 1, 15);
                    assert(result !== null, 'should detect horizontal win');
                    assertEqual(result.player, 1, 'winner should be player 1');
                }
            },
            {
                name: 'checkWinner — detects vertical 5-in-a-row',
                fn: () => {
                    const b = emptyCaroBoard();
                    [3, 4, 5, 6, 7].forEach(r => b[r][5] = 2);
                    const result = caroModule.checkWinner(b, 5, 5, 2, 15);
                    assert(result !== null, 'should detect vertical win');
                    assertEqual(result.player, 2, 'winner should be player 2');
                }
            },
            {
                name: 'checkWinner — detects diagonal 5-in-a-row',
                fn: () => {
                    const b = emptyCaroBoard();
                    [0, 1, 2, 3, 4].forEach(i => b[3 + i][3 + i] = 1);
                    const result = caroModule.checkWinner(b, 5, 5, 1, 15);
                    assert(result !== null, 'should detect diagonal win');
                }
            },
            {
                name: 'checkWinner — detects anti-diagonal 5-in-a-row',
                fn: () => {
                    const b = emptyCaroBoard();
                    [0, 1, 2, 3, 4].forEach(i => b[3 + i][10 - i] = 2);
                    const result = caroModule.checkWinner(b, 5, 8, 2, 15);
                    assert(result !== null, 'should detect anti-diagonal win');
                }
            },
            {
                name: 'checkWinner — null for only 4-in-a-row',
                fn: () => {
                    const b = emptyCaroBoard();
                    [3, 4, 5, 6].forEach(c => b[5][c] = 1);
                    const result = caroModule.checkWinner(b, 5, 4, 1, 15);
                    assert(result === null, '4-in-a-row should not win');
                }
            },
            {
                name: 'checkWinner — does not confuse P1 and P2',
                fn: () => {
                    const b = emptyCaroBoard();
                    [3, 4, 5, 6, 7].forEach(c => b[5][c] = 1);
                    const result = caroModule.checkWinner(b, 5, 5, 2, 15);
                    assert(result === null, 'P1 tiles should not be counted as P2 win');
                }
            },
            {
                name: 'checkWinner — 3x3 tic-tac-toe mode (3-in-a-row)',
                fn: () => {
                    const b = emptyCaroBoard(3);
                    [0, 1, 2].forEach(c => b[1][c] = 1);
                    const result = caroModule.checkWinner(b, 1, 1, 1, 3);
                    assert(result !== null, '3-in-a-row on 3x3 should win');
                }
            },
            {
                name: 'getFilledCellsCount — 0 for empty board',
                fn: () => {
                    assertEqual(caroModule.getFilledCellsCount(emptyCaroBoard(), 15), 0, 'empty board count should be 0');
                }
            },
            {
                name: 'getFilledCellsCount — counts correctly',
                fn: () => {
                    const b = emptyCaroBoard();
                    b[0][0] = 1; b[5][5] = 2; b[14][14] = 1;
                    assertEqual(caroModule.getFilledCellsCount(b, 15), 3, 'should count 3 cells');
                }
            },
        ]
    },
    {
        id: 'sudoku',
        name: '🧩 Sudoku Logic',
        color: '#10b981',
        tests: [
            {
                name: 'isValid — true for empty board',
                fn: () => {
                    const b = Array.from({ length: 9 }, () => Array(9).fill(0));
                    assert(sudokuModule.isValid(b, 0, 0, 5), 'should be valid on empty board');
                }
            },
            {
                name: 'isValid — false if duplicate in row',
                fn: () => {
                    const b = Array.from({ length: 9 }, () => Array(9).fill(0));
                    b[0][5] = 5;
                    assert(!sudokuModule.isValid(b, 0, 0, 5), 'should be invalid if exists in row');
                }
            },
            {
                name: 'isValid — false if duplicate in column',
                fn: () => {
                    const b = Array.from({ length: 9 }, () => Array(9).fill(0));
                    b[5][0] = 5;
                    assert(!sudokuModule.isValid(b, 0, 0, 5), 'should be invalid if exists in column');
                }
            },
            {
                name: 'isValid — false if duplicate in 3x3 box',
                fn: () => {
                    const b = Array.from({ length: 9 }, () => Array(9).fill(0));
                    b[1][1] = 5;
                    assert(!sudokuModule.isValid(b, 0, 0, 5), 'should be invalid if exists in box');
                }
            },
            {
                name: 'solveBoard — solves simple puzzle',
                fn: () => {
                    const b = [
                        [5, 3, 0, 0, 7, 0, 0, 0, 0],
                        [6, 0, 0, 1, 9, 5, 0, 0, 0],
                        [0, 9, 8, 0, 0, 0, 0, 6, 0],
                        [8, 0, 0, 0, 6, 0, 0, 0, 3],
                        [4, 0, 0, 8, 0, 3, 0, 0, 1],
                        [7, 0, 0, 0, 2, 0, 0, 0, 6],
                        [0, 6, 0, 0, 0, 0, 2, 8, 0],
                        [0, 0, 0, 4, 1, 9, 0, 0, 5],
                        [0, 0, 0, 0, 8, 0, 0, 7, 9]
                    ];
                    const solved = sudokuModule.solveBoard(b);
                    assert(solved, 'should be solvable');
                    assert(b.every(row => row.every(cell => cell !== 0)), 'should be full');
                }
            },
            {
                name: 'generateFullBoard — full and valid',
                fn: () => {
                    const b = sudokuModule.generateFullBoard();
                    assert(b.every(row => row.every(cell => cell !== 0)), 'should be full');
                }
            },
            {
                name: 'generateSudoku — puzzle and solution',
                fn: () => {
                    const { puzzle, solution } = sudokuModule.generateSudoku('Easy');
                    assert(puzzle && solution, 'should return puzzle and solution');
                    const blanks = puzzle.flat().filter(v => v === 0).length;
                    assert(blanks > 0, 'puzzle should have blanks');
                }
            }
        ]
    }
];

// ─── Backend Tests ────────────────────────────────────────────────────────────

async function runBackendTests(setBackendState) {
    setBackendState({ status: 'running', latency: null, data: null, error: null });
    const start = performance.now();
    try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
        const latency = Math.round(performance.now() - start);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBackendState({ status: data.status === 'ok' ? 'pass' : 'warn', latency, data, error: null });
    } catch (err) {
        setBackendState({ status: 'fail', latency: null, data: null, error: err.message });
    }
}

// ─── UI Components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        pass:    { color: '#22c55e', icon: <CheckCircle size={14} />, label: 'PASS' },
        fail:    { color: '#ef4444', icon: <XCircle size={14} />, label: 'FAIL' },
        warn:    { color: '#f59e0b', icon: <Clock size={14} />, label: 'WARN' },
        running: { color: '#60a5fa', icon: <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />, label: 'RUNNING' },
        idle:    { color: '#475569', icon: <Clock size={14} />, label: 'IDLE' },
    };
    const s = map[status] || map.idle;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700,
            background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44`,
            borderRadius: 4, padding: '2px 8px', letterSpacing: '0.05em' }}>
            {s.icon} {s.label}
        </span>
    );
}

function SuiteCard({ suite, results, running }) {
    const [expanded, setExpanded] = useState(true);
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const total = suite.tests.length;
    const allDone = results.length === total;

    return (
        <div style={{ background: '#1e293b', borderRadius: 12, border: `1px solid ${suite.color}33`, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <div
                onClick={() => setExpanded(e => !e)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                    background: `linear-gradient(90deg, ${suite.color}15 0%, transparent 100%)`,
                    cursor: 'pointer', borderBottom: expanded ? `1px solid ${suite.color}22` : 'none' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', flex: 1 }}>{suite.name}</span>
                {allDone && <span style={{ fontSize: '0.8rem', color: failed > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                    {passed}/{total} passed
                </span>}
                {running && <RefreshCw size={14} color='#60a5fa' style={{ animation: 'spin 1s linear infinite' }} />}
                {expanded ? <ChevronUp size={16} color='#64748b' /> : <ChevronDown size={16} color='#64748b' />}
            </div>

            {expanded && (
                <div style={{ padding: '8px 0' }}>
                    {suite.tests.map((test, i) => {
                        const result = results[i];
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                background: result?.status === 'fail' ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                                <div style={{ width: 20, flexShrink: 0 }}>
                                    {!result && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#334155', margin: 'auto' }} />}
                                    {result?.status === 'pass' && <CheckCircle size={16} color='#22c55e' />}
                                    {result?.status === 'fail' && <XCircle size={16} color='#ef4444' />}
                                    {result?.status === 'running' && <RefreshCw size={16} color='#60a5fa' style={{ animation: 'spin 1s linear infinite' }} />}
                                </div>
                                <span style={{ flex: 1, fontSize: '0.83rem', color: result?.status === 'fail' ? '#fca5a5' : '#cbd5e1' }}>
                                    {test.name}
                                </span>
                                {result?.duration !== undefined && (
                                    <span style={{ fontSize: '0.72rem', color: '#475569' }}>{result.duration}ms</span>
                                )}
                                {result?.error && (
                                    <span style={{ fontSize: '0.72rem', color: '#ef4444', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {result.error}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function GameTestDashboard() {
    const navigate = useNavigate();
    const [suiteResults, setSuiteResults] = useState({});
    const [backendState, setBackendState] = useState({ status: 'idle', latency: null, data: null, error: null });
    const [running, setRunning] = useState(false);
    const [modulesReady, setModulesReady] = useState(false);
    const [runCount, setRunCount] = useState(0);

    useEffect(() => {
        loadModules().then(() => setModulesReady(true));
    }, []);

    const runAllTests = useCallback(async () => {
        setRunning(true);
        setSuiteResults({});
        setRunCount(c => c + 1);

        // Backend check
        runBackendTests(setBackendState);

        // Game logic suites
        for (const suite of TEST_SUITES) {
            const results = [];
            for (const test of suite.tests) {
                setSuiteResults(prev => ({
                    ...prev,
                    [suite.id]: [...(prev[suite.id] || []), { name: test.name, status: 'running' }]
                }));
                const result = await runTest(test.name, test.fn);
                results.push(result);
                setSuiteResults(prev => {
                    const existing = [...(prev[suite.id] || [])];
                    existing[results.length - 1] = result;
                    return { ...prev, [suite.id]: existing };
                });
                await new Promise(r => setTimeout(r, 20)); // small delay for UI update
            }
        }

        setRunning(false);
    }, []);

    // Auto-run once modules are ready
    useEffect(() => {
        if (modulesReady) runAllTests();
    }, [modulesReady]);

    // Summary stats
    const allResults = Object.values(suiteResults).flat();
    const totalPass = allResults.filter(r => r.status === 'pass').length;
    const totalFail = allResults.filter(r => r.status === 'fail').length;
    const totalTests = TEST_SUITES.reduce((a, s) => a + s.tests.length, 0);

    return (
        <div style={{ minHeight: '100vh', padding: '2rem 1rem', boxSizing: 'border-box', maxWidth: 900, margin: '0 auto' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '2rem' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>
                        🧪 GameOnl Test Suite
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                        Vitest Unit Tests + Backend Health — Run #{runCount || '—'}
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {allResults.length > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: totalFail === 0 ? '#22c55e' : '#ef4444' }}>
                                {totalPass}/{totalTests}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>PASSED</div>
                        </div>
                    )}
                    <button
                        onClick={runAllTests}
                        disabled={running || !modulesReady}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}>
                        {running ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
                        {running ? 'Running...' : 'Run All Tests'}
                    </button>
                </div>
            </div>

            {/* Backend Health Card */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Server size={20} color='#60a5fa' />
                    <span style={{ fontWeight: 700, color: '#fff' }}>Backend Health</span>
                    <StatusBadge status={backendState.status} />
                </div>
                {backendState.latency && (
                    <div style={{ display: 'flex', align: 'center', gap: 6, fontSize: '0.83rem', color: '#94a3b8' }}>
                        <Wifi size={14} color='#4ade80' /> Ping: <strong style={{ color: '#4ade80' }}>{backendState.latency}ms</strong>
                    </div>
                )}
                {backendState.data && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#94a3b8' }}>
                            <Database size={14} color={backendState.data.db.status === 'connected' ? '#4ade80' : '#ef4444'} />
                            DB: <strong style={{ color: backendState.data.db.status === 'connected' ? '#4ade80' : '#ef4444' }}>{backendState.data.db.status}</strong>
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#94a3b8' }}>
                            Uptime: <strong style={{ color: '#cbd5e1' }}>{backendState.data.server.uptimeHuman}</strong>
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#94a3b8' }}>
                            Sockets: <strong style={{ color: '#cbd5e1' }}>{backendState.data.sockets.connected}</strong>
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#94a3b8' }}>
                            Memory: <strong style={{ color: '#cbd5e1' }}>{backendState.data.memory.heapUsed}</strong>
                        </div>
                    </>
                )}
                {backendState.status === 'fail' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#ef4444' }}>
                        <WifiOff size={14} /> {backendState.error}
                    </div>
                )}
            </div>

            {/* Module load warning */}
            {!modulesReady && (
                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: '1rem', color: '#fbbf24', fontSize: '0.85rem' }}>
                    ⏳ Đang tải game modules...
                </div>
            )}

            {/* Test Suites */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {TEST_SUITES.map(suite => (
                    <SuiteCard
                        key={suite.id}
                        suite={suite}
                        results={suiteResults[suite.id] || []}
                        running={running}
                    />
                ))}
            </div>

            {/* Footer hint */}
            <div style={{ marginTop: '2rem', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', color: '#475569' }}>
                💡 Để chạy test từ terminal: <code style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>npm run test</code> &nbsp;|&nbsp;
                Xem báo cáo coverage: <code style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>npm run test:ui</code>
            </div>
        </div>
    );
}
