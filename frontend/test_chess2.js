import { Chess } from 'chess.js';

const game = new Chess();
game.move({ from: 'e2', to: 'e4' });
try {
    console.log('isCheckmate:', game.isCheckmate());
    console.log('isDraw:', game.isDraw());
    console.log('turn:', game.turn());
    console.log('isCheck:', game.isCheck());
    console.log('history size:', game.history({ verbose: true }).length);
} catch (e) {
    console.error('Error in state checking:', e.message);
}
