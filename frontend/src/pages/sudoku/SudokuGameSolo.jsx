import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAudio } from '../../utils/useAudio';
import { useSudokuLogic } from './useSudokuLogic';
import Board from '../../components/Board';
import Controls from '../../components/Controls';
import { ArrowLeft, RotateCcw, AlertTriangle, Clock, Target, ShieldAlert, Award } from 'lucide-react';

export default function SudokuGameSolo() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { playWinSound, playLoseSound, playSudokuClickSound, playSudokuErrorSound } = useAudio();

    // Map audio sounds directly inside callbacks for Logic Hook
    const logicCallbacks = {
        onWin: playWinSound,
        onLose: playLoseSound
    };

    const logic = useSudokuLogic(location.state?.difficulty || 'Medium', logicCallbacks);
    const {
        difficulty, initialPuzzle, userAnswers, notes, selectedCell, setSelectedCell,
        notesMode, errors, completedNumbers, isGameOver, errorCount, time, won, hintsUsed,
        startNewGame, handleNumberClick, handleActionClick
    } = logic;

    // Additional click handler hook
    const handleNumClickWithSound = (num) => {
        handleNumberClick(num);
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isGameOver && (e.key === ' ' || e.code === 'Space')) {
                e.preventDefault();
                startNewGame();
                return;
            }
            if (e.key >= '1' && e.key <= '9') {
                handleNumClickWithSound(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                handleActionClick('erase');
            } else if (e.key === 'n' || e.key === 'N') {
                handleActionClick('notes');
            } else if (e.key.startsWith('Arrow')) {
                if (!selectedCell) {
                    setSelectedCell({ r: 0, c: 0 });
                    return;
                }
                let { r, c } = selectedCell;
                if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
                if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
                if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
                if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
                setSelectedCell({ r, c });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, isGameOver, startNewGame, handleActionClick, handleNumClickWithSound, setSelectedCell]);

    if (!initialPuzzle) return <div className="full-page-mobile-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#fff' }}>Đang tải...</div>;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="sudoku-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        }}>

            {/* Main content */}
            <div className="sudoku-layout-wrapper" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* LEFT PANEL - Stats */}
                <div className="sudoku-left-panel" style={{
                    flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '1rem',
                    padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Difficulty Card */}
                        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(59,130,246,0.2)', padding: '8px', borderRadius: '8px' }}>
                                <Target size={20} color="#60a5fa" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Độ khó</div>
                                <div style={{ fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>{difficulty}</div>
                            </div>
                        </div>

                        {/* Mistakes Card */}
                        <div style={{ background: errorCount >= 2 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${errorCount >= 2 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s' }}>
                            <div style={{ background: errorCount >= 2 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                                <ShieldAlert size={20} color={errorCount >= 2 ? "#ef4444" : "#94a3b8"} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Lỗi sai</div>
                                <div style={{ fontSize: '1.1rem', color: errorCount >= 2 ? '#ef4444' : '#f8fafc', fontWeight: 800 }}>{errorCount} / 3</div>
                            </div>
                        </div>

                        {/* Time Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                                <Clock size={20} color="#fcd34d" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Thời gian</div>
                                <div style={{ fontSize: '1.1rem', color: '#fcd34d', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatTime(time)}</div>
                            </div>
                        </div>

                        {/* Hints Metric */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Gợi ý đã dùng</span>
                            <span style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 700 }}>{hintsUsed}</span>
                        </div>
                        
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '10px', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={() => startNewGame()} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                                <RotateCcw size={16} /> Bắt đầu ván mới
                            </button>
                            <button onClick={() => navigate('/sudoku')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                                <ArrowLeft size={16} /> {t('common.returnToMenu', 'Về sảnh')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* CENTER - BOARD */}
                <div className="sudoku-board-area" style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
                    <div style={{ position: 'relative' }}>
                        <Board
                            initialPuzzle={initialPuzzle}
                            userAnswers={userAnswers}
                            notes={notes}
                            selectedCell={selectedCell}
                            setSelectedCell={setSelectedCell}
                            errors={errors}
                        />

                        {isGameOver && (
                            <div style={{ position: 'absolute', inset: -8, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', zIndex: 10, border: `1px solid ${won ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, boxShadow: `0 0 40px ${won ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}`, animation: 'fadeIn 0.4s ease' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: won ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                    {won ? <Award size={40} color="#4ade80" /> : <ShieldAlert size={40} color="#ef4444" />}
                                </div>
                                <h2 style={{ color: won ? '#4ade80' : '#ef4444', fontSize: '2.5rem', margin: '0 0 8px 0', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                    {won ? 'HOÀN THÀNH!' : 'THẤT BẠI'}
                                </h2>
                                <p style={{ color: '#cbd5e1', fontSize: '1rem', margin: '0 0 24px 0', textAlign: 'center', maxWidth: '80%' }}>
                                    {won ? `Bạn đã giải quyết mức độ ${difficulty} trong ${Math.floor(time/60)} phút ${String(time%60).padStart(2,'0')} giây.` : `Bạn đã mắc quá 3 lỗi sai cho phép. Đừng nản chí!`}
                                </p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => startNewGame()} style={{ padding: '12px 28px', fontSize: '1.05rem', fontWeight: 700, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.4)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                                        CHƠI LẠI
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - CONTROLS */}
                <div className="sudoku-right-panel" style={{
                    flex: '0 0 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    padding: '1.5rem', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    <Controls
                        onNumberClick={handleNumClickWithSound}
                        onActionClick={handleActionClick}
                        notesMode={notesMode}
                        completedNumbers={completedNumbers}
                    />
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                @media (max-width: 950px) {
                    .sudoku-layout-wrapper {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                    }
                    .sudoku-left-panel {
                        flex: 0 0 auto !important;
                        flex-direction: row !important;
                        flex-wrap: wrap !important;
                        justify-content: center !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        padding: 1rem !important;
                        gap: 1rem !important;
                    }
                    .sudoku-left-panel > div {
                        flex-direction: row !important;
                        flex-wrap: wrap !important;
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    .sudoku-left-panel > div > div {
                        padding: 10px !important;
                        flex: 1 1 120px !important;
                        max-width: 200px !important;
                    }
                    .sudoku-board-area {
                        flex: 0 0 auto !important;
                        padding: 1.5rem 0.5rem !important;
                    }
                    .sudoku-right-panel {
                        flex: 0 0 auto !important;
                        border-left: none !important;
                        padding: 1rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
