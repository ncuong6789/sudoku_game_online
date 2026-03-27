import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Trophy, ArrowLeft, RefreshCw, Handshake, Users, ShieldAlert, RotateCcw, Swords, Crown } from 'lucide-react';
import { useAudio } from '../../utils/useAudio';

// ... (getPieceUnicode & CustomChessboard components)
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
// Helper function to get Unicode chess piece
const getPieceUnicode = (piece) => {
    if (!piece) return '';
    const pieces = {
        w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
        b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
    };
    return pieces[piece.color][piece.type];
};

// Custom Chessboard Component
function CustomChessboard({
    game,
    myColor,
    onSquareClick,
    onDrop,
    customSquareStyles,
    moveFrom,
    optionSquares,
    gameOver,
    boardOrientation
}) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const displayRanks = boardOrientation === 'w' ? ranks.slice().reverse() : ranks;
    const displayFiles = boardOrientation === 'w' ? files : files.slice().reverse();

    const handleDragStart = (e, sourceSquare, piece) => {
        if (gameOver || piece.color !== myColor) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('sourceSquare', sourceSquare);
        e.dataTransfer.setData('piece', JSON.stringify(piece));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetSquare) => {
        e.preventDefault();
        const sourceSquare = e.dataTransfer.getData('sourceSquare');
        if (sourceSquare) {
            onDrop(sourceSquare, targetSquare);
        }
    };

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            aspectRatio: '1 / 1',
            backgroundColor: 'rgba(20, 20, 30, 0.8)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
        }}>
            <div
                className="grid"
                style={{
                    gridTemplateColumns: `repeat(8, 1fr)`,
                    gridTemplateRows: `repeat(8, 1fr)`,
                    width: '100%',
                    height: '100%',
                }}
            >
                {displayRanks.map((rank) =>
                    displayFiles.map((file) => {
                        const square = file + rank;
                        const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
                        const piece = game.get(square);

                        const squareStyle = {
                            ...customSquareStyles[square],
                            ...(optionSquares[square] || {}),
                            backgroundColor: isLight ? 'rgba(173, 216, 230, 0.1)' : 'rgba(0, 0, 0, 0.3)', // Light blue tint for light squares, darker for dark
                            backdropFilter: 'blur(5px)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative',
                            cursor: gameOver || (piece && piece.color !== myColor) ? 'default' : 'pointer',
                            boxShadow: (moveFrom === square || optionSquares[square]) ? '0 0 10px 2px rgba(79, 172, 254, 0.8)' : 'none', // Neon glow for selected/option squares
                            transition: 'box-shadow 0.2s ease-in-out',
                        };

                        return (
                            <div
                                key={square}
                                id={square}
                                style={{
                                    ...squareStyle,
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    userSelect: 'none'
                                }}
                                onClick={() => onSquareClick(square)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, square)}
                            >
                                {piece && (
                                    <div
                                        draggable={piece.color === myColor && !gameOver}
                                        onDragStart={(e) => handleDragStart(e, square, piece)}
                                        style={{
                                            fontSize: 'min(7vh, 7vw)',
                                            lineHeight: 1,
                                            cursor: piece.color === myColor && !gameOver ? 'grab' : 'default',
                                            color: piece.color === 'w' ? '#f0f0f0' : '#303030',
                                            textShadow: piece.color === 'w'
                                                ? '2px 2px 4px rgba(0, 0, 0, 0.7), -2px -2px 4px rgba(255, 255, 255, 0.3)'
                                                : '2px 2px 4px rgba(255, 255, 255, 0.7), -2px -2px 4px rgba(0, 0, 0, 0.3)',
                                            filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))', // Subtle neon glow for pieces
                                            zIndex: 10,
                                        }}
                                    >
                                        {getPieceUnicode(piece)}
                                    </div>
                                )}
                                {/* Rank and File Labels */}
                                {file === displayFiles[0] && (
                                    <span style={{ position: 'absolute', left: '4px', top: '0px', fontSize: '0.75rem', opacity: 0.7, color: isLight ? '#5f8099' : '#d1dee6', fontWeight: 'bold' }}>
                                        {rank}
                                    </span>
                                )}
                                {rank === displayRanks[displayRanks.length - 1] && (
                                    <span style={{ position: 'absolute', right: '4px', bottom: '0px', fontSize: '0.75rem', opacity: 0.7, color: isLight ? '#5f8099' : '#d1dee6', fontWeight: 'bold' }}>
                                        {file}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


export default function ChessGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    const [game, setGame] = useState(new Chess());
    const [realPlayerColor, setRealPlayerColor] = useState(() => {
        if (playerColor === 'random') {
            return Math.random() < 0.5 ? 'w' : 'b';
        }
        return playerColor;
    });
    const [moveHistory, setMoveHistory] = useState([]); 

    const myColor = realPlayerColor || 'w';
    
    // UI State
    const [moveFrom, setMoveFrom] = useState(null);
    const [optionSquares, setOptionSquares] = useState({});

    const { playChessMoveSound, playChessCaptureSound, playChessCheckSound, playWinSound, playLoseSound } = useAudio();

    // 1. Cập nhật Status, History mỗi khi `game` thay đổi.
    useEffect(() => {
        const history = game.history({ verbose: true });
        setMoveHistory(history);
        
        if (history.length > 0) {
            const lastMove = history[history.length - 1];
            if (game.isCheckmate()) {
                if (game.turn() === myColor) playLoseSound(); // Mình thua
                else playWinSound(); // Mình thắng
            } else if (game.isDraw()) {
                playChessMoveSound();
            } else if (game.isCheck()) {
                playChessCheckSound();
            } else if (lastMove.flags.includes('c')) {
                playChessCaptureSound();
            } else {
                playChessMoveSound();
            }
        }

        let status = '';
        if (game.isCheckmate()) {
            status = `Chiếu Bí! ${game.turn() === 'w' ? 'Đen' : 'Trắng'} thắng.`;
            setGameOver(true);
        } else if (game.isDraw()) {
            status = 'Hòa cờ!';
            setGameOver(true);
        } else {
            status = game.turn() === myColor 
                ? 'Đến lượt bạn.' 
                : `Đến lượt đối thủ.`;
        }
        setStatusMessage(status);
        
    }, [game, myColor, playChessMoveSound, playChessCaptureSound, playChessCheckSound, playWinSound, playLoseSound]);

    // Lắng nghe Socket cho Multiplayer
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ move, fen: newFen }) => {
                setGame((g) => {
                    const newGame = new Chess();
                    newGame.loadPgn(g.pgn());
                    
                    if (move) {
                        try {
                            newGame.move(move);
                            return newGame;
                        } catch (e) {
                            console.error("Lỗi đồng bộ move, dùng FEN fallback");
                        }
                    }
                    
                    // Fallback dùng FEN nếu không có move hoặc lỗi
                    try { newGame.load(newFen); } catch (e) { return g; }
                    return newGame;
                });
            };
            const handleOpponentDisconnect = () => {
                if (!gameOver) {
                    setGameOver(true);
                    setWinner(myColor);
                    setStatusMessage(`Bạn đã thắng! Đối thủ thoái thác.`);
                }
            };
            socket.on('chessMoved', handleOpponentMove);
            socket.on('opponentDisconnected', handleOpponentDisconnect);
            return () => {
                socket.off('chessMoved', handleOpponentMove);
                socket.off('opponentDisconnected', handleOpponentDisconnect);
            };
        }
    }, [mode, roomId, gameOver, myColor]);

    useEffect(() => {
        return () => {
             if (roomId) socket.emit('leaveRoom', roomId);
        };
    }, [roomId]);

    // AI Logic cho Solo
    const makeAIMove = useCallback(() => {
        setGame((g) => {
            const moves = g.moves({ verbose: true });
            if (moves.length === 0) return g;

            let move = null;
            if (difficulty === 'Easy') {
                move = moves[Math.floor(Math.random() * moves.length)];
            } else {
                const captures = moves.filter(m => m.flags.includes('c'));
                if (captures.length > 0) {
                    move = captures[Math.floor(Math.random() * captures.length)];
                } else {
                    move = moves[Math.floor(Math.random() * moves.length)];
                }
            }
            
            try {
                const gameCopy = new Chess();
                gameCopy.loadPgn(g.pgn());
                gameCopy.move(move);
                return gameCopy;
            } catch (e) { return g; }
        });
    }, [difficulty]);

    useEffect(() => {
        if (mode === 'solo' && !gameOver && game.turn() !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [game, mode, gameOver, myColor, makeAIMove]);

    // Hàm an toàn để thực thi nước đi của người chơi
    function attemptPlayerMove(sourceSquare, targetSquare) {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());

        const legalMoves = gameCopy.moves({ square: sourceSquare, verbose: true });
        const foundMove = legalMoves.find(m => m.to === targetSquare);

        if (!foundMove) return false;

        const moveObj = { from: sourceSquare, to: targetSquare };
        if (foundMove.promotion) moveObj.promotion = 'q';

        try {
            gameCopy.move(moveObj);
            
            // Cập nhật State tức thì (Synchronous Object Reference Update)
            setGame(gameCopy);

            setMoveFrom(null);
            setOptionSquares({});
            if (mode === 'multiplayer') {
                socket.emit('chessMove', { roomId, move: moveObj, fen: gameCopy.fen() });
            }
            return true;
        } catch (e) {
            console.error('Lỗi di chuyển: ', e);
            return false;
        }
    }

    function onDrop(sourceSquare, targetSquare, piece) {
        if (gameOver || game.turn() !== myColor) return false;
        return attemptPlayerMove(sourceSquare, targetSquare);
    }

    function onSquareClick(square) {
        if (gameOver || game.turn() !== myColor) return;

        function resetFirstMove(sq) {
            const hasPiece = game.get(sq);
            if (hasPiece && hasPiece.color === myColor) {
                setMoveFrom(sq);
                return getMoveOptions(sq);
            }
            setMoveFrom(null);
            setOptionSquares({});
            return false;
        }

        function getMoveOptions(sq) {
            const moves = game.moves({ square: sq, verbose: true });
            if (moves.length === 0) {
                setOptionSquares({});
                return false;
            }

            const newSquares = {};
            moves.map((move) => {
                newSquares[move.to] = {
                    background: game.get(move.to) && game.get(move.to).color !== game.get(sq).color
                        ? 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 85%, transparent 85%)'
                        : 'radial-gradient(circle, rgba(79, 172, 254, 0.6) 25%, transparent 25%)',
                    borderRadius: '50%'
                };
            });
            newSquares[sq] = { background: 'rgba(79, 172, 254, 0.5)' }; // highlighted selected
            setOptionSquares(newSquares);
            return true;
        }

        if (!moveFrom) {
            return resetFirstMove(square);
        }

        // Đã có từ moveFrom, thử đi quân
        const isSuccess = attemptPlayerMove(moveFrom, square);
        if (!isSuccess) {
            return resetFirstMove(square);
        }
        return true;
    }

    const handleReset = () => {
        if (mode === 'solo') {
            setGame(new Chess());
            setGameOver(false);
            setMoveFrom(null);
            setOptionSquares({});
        }
    };
    const customSquareStyles = useMemo(() => {
        const styles = { ...optionSquares };
        if (moveHistory.length > 0) {
            const lastMove = moveHistory[moveHistory.length - 1];
            // Highlight background cho From và To của nước cờ vừa rồi
            styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
            styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
        }
        return styles;
    }, [optionSquares, moveHistory]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="nav-item active" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Crown size={18} /> Cờ vua
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {mode === 'solo' ? `Thách đấu AI (${difficulty})` : `Phòng: ${roomId}`}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {mode === 'solo' && (
                            <button className="btn-secondary" onClick={handleReset} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                <RotateCcw size={16} /> Chơi lại
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <ArrowLeft size={16} /> Thoát
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>

                    {/* Bàn cờ bằng react-chessboard */}
                    <div style={{ flex: '1 1 500px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <div style={{
                            position: 'relative', // cần cho overlay
                            width: '100%',
                            maxWidth: '70vh',
                            aspectRatio: '1 / 1',
                            border: '4px solid rgba(20, 20, 30, 0.8)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            overflow: 'hidden',
                            background: 'rgba(255, 255, 255, 0.1)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(8, 1fr)',
                            gridTemplateRows: 'repeat(8, 1fr)'
                        }}>
                            {/* Render Bàn cờ 64 ô tự custom cực chuẩn UI */}
                            {(() => {
                                const board = game.board(); // Mảng 2 chiều 8x8 chứa object quân cờ
                                const ranks = [8,7,6,5,4,3,2,1];
                                const files = ['a','b','c','d','e','f','g','h'];
                                
                                const isFlipped = myColor === 'b';
                                const displayRanks = isFlipped ? [...ranks].reverse() : ranks;
                                const displayFiles = isFlipped ? [...files].reverse() : files;

                                const unicodePieces = {
                                    'w': { 'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕', 'k': '♔' },
                                    'b': { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚' }
                                };

                                const squares = [];
                                for (let i = 0; i < 8; i++) {
                                    for (let j = 0; j < 8; j++) {
                                        const r = displayRanks[i];
                                        const f = displayFiles[j];
                                        const sq = f + r;
                                        
                                        // Màu ô kẻ caro
                                        const isLight = (r + files.indexOf(f)) % 2 !== 0;
                                        const bgColor = isLight ? '#d1dee6' : '#5f8099';
                                        
                                        // Tìm dữ liệu quân cờ tại tọa độ ô chuẩn
                                        const piece = game.get(sq); 
                                        
                                        // Kiểm tra Option Styles cho nước cờ đi được và Highlight nước đi cuối
                                        const highlightStyle = customSquareStyles[sq] || {};
                                        let finalBg = highlightStyle.backgroundColor || bgColor;
                                        let dotOverlay = optionSquares[sq]?.background; // Chấm tròn điểm đến hợp lệ (giữ riêng từ optionSquares)

                                        // HIỆU ỨNG CHIẾU VUA (Đỏ rực ô Vua)
                                        if (game.inCheck() && piece && piece.type === 'k' && piece.color === game.turn()) {
                                            finalBg = 'rgba(239, 68, 68, 0.7)';
                                            highlightStyle.animation = 'blink-red 0.8s infinite';
                                        }

                                        squares.push(
                                            <div 
                                                key={sq}
                                                onClick={() => onSquareClick(sq)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const sourceSq = e.dataTransfer.getData('text/plain');
                                                    if(sourceSq !== sq) attemptPlayerMove(sourceSq, sq);
                                                }}
                                                style={{
                                                    backgroundColor: finalBg,
                                                    position: 'relative',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    cursor: game.turn() === myColor ? 'pointer' : 'default',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                {dotOverlay && (
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                        background: dotOverlay, pointerEvents: 'none'
                                                    }}/>
                                                )}
                                                
                                                {piece && (
                                                    <span 
                                                        draggable={piece.color === myColor && game.turn() === myColor}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('text/plain', sq);
                                                            e.dataTransfer.effectAllowed = 'move';
                                                            onSquareClick(sq); // Lấy highlight move path ngay khi nhấc
                                                        }}
                                                        style={{
                                                            fontSize: 'min(7vh, 7vw)',
                                                            lineHeight: 1,
                                                            color: piece.color === 'w' ? '#fff' : '#1e1e1e',
                                                            textShadow: piece.color === 'w' 
                                                                ? '0px 2px 4px rgba(0,0,0,0.8), 0 0 2px #fff'
                                                                : '0px 2px 4px rgba(255,255,255,0.4), 0 0 4px #000',
                                                            position: 'relative',
                                                            zIndex: 2,
                                                            cursor: piece.color === myColor ? 'grab' : 'default'
                                                        }}
                                                    >
                                                        {unicodePieces[piece.color][piece.type]}
                                                    </span>
                                                )}

                                                {/* Hiển thị tên Cột và Hàng mờ ở viền bàn cờ */}
                                                {i === 7 && <span style={{position:'absolute', bottom: '2px', right: '4px', fontSize:'0.7rem', color: isLight?'#5f8099':'#d1dee6', fontWeight: 'bold'}}>{f}</span>}
                                                {j === 0 && <span style={{position:'absolute', top: '2px', left: '4px', fontSize:'0.7rem', color: isLight?'#5f8099':'#d1dee6', fontWeight: 'bold'}}>{r}</span>}
                                            </div>
                                        );
                                    }
                                }
                                return squares;
                            })()}

                            {/* GAME OVER OVERLAY - bên trong div position:relative */}
                            {gameOver && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(13, 17, 23, 0.88)', backdropFilter: 'blur(4px)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '4px', zIndex: 20, gap: '12px'
                                }}>
                                    <div style={{ fontSize: '4rem' }}>
                                        {statusMessage.includes('Thắng') ? '🏆' : statusMessage.includes('Hoà') ? '🤝' : '💀'}
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '2rem', textAlign: 'center', color: statusMessage.includes('Thắng') ? 'var(--success-color)' : statusMessage.includes('Hoà') ? '#fbbf24' : 'var(--error-color)' }}>
                                        {statusMessage}
                                    </h2>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        {mode === 'solo' && (
                                            <button className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}
                                                onClick={() => navigate('/chess')}>
                                                🔄 Ván mới
                                            </button>
                                        )}
                                        <button className="btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}
                                            onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')}>
                                            🚪 Thoát
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bảng trạng thái bên phải */}
                    <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 1rem 0' }}>Trạng thái</h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    background: game.turn() === 'w' ? '#f8f9fa' : '#212529',
                                    border: '2px solid rgba(255,255,255,0.5)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    flexShrink: 0
                                }}></div>
                                <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: gameOver ? 'var(--error-color)' : game.turn() === myColor ? 'var(--primary-color)' : 'white' }}>
                                    {statusMessage}
                                </span>
                            </div>

                            {/* CẢNH BÁO CHIẾU VUA DÀNH CHO NGƯỜI CHƠI ĐANG BỊ CHIẾU */}
                            {game.isCheck() && !gameOver && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '1rem',
                                    animation: 'pulse 1.5s infinite'
                                }}>
                                    <ShieldAlert color="var(--error-color)" size={20} />
                                    <span style={{ color: 'var(--error-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {game.turn() === myColor ? 'BẠN ĐANG BỊ CHIẾU!' : 'ĐỐI THỦ ĐANG BỊ CHIẾU!'}
                                    </span>
                                </div>
                            )}

                            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Phe của bạn:</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '4px',
                                        background: myColor === 'w' ? '#f8f9fa' : '#212529',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: myColor === 'w' ? '#000' : '#fff'
                                    }}>
                                        {myColor === 'w' ? '♔' : '♚'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{myColor === 'w' ? 'Trắng (Đi trước)' : 'Đen'}</span>
                                </div>
                            </div>

                            {/* Lịch sử di chuyển */}
                            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Lịch sử giao tranh</h4>
                                <div style={{
                                    flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '8px', padding: '0.5rem', maxHeight: '150px'
                                }}>
                                    {moveHistory.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '40px 0' }}>Chưa có nước đi nào</p>}
                                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                                        <div key={i} style={{ display: 'flex', fontSize: '0.85rem', padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ width: '30px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{i + 1}.</span>
                                            <span style={{ flex: 1, color: '#f8f9fa' }}>{moveHistory[i * 2]?.san}</span>
                                            <span style={{ flex: 1, color: '#aaa' }}>{moveHistory[i * 2 + 1]?.san || ''}</span>
                                        </div>
                                    ))}
                                    <div ref={el => el && el.scrollIntoView({ behavior: 'smooth' })} />
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}
