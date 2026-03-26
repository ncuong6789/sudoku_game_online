import { Chess } from 'chess.js';

const game = new Chess();
const moves = game.moves({ square: 'e2', verbose: true });
console.log('Legal moves for e2:', moves);

const moveObj = { from: 'e2', to: 'e4' };
try {
    const m = game.move(moveObj);
    console.log('Move success:', m);
    console.log('FEN:', game.fen());
} catch (e) {
    console.error('Move failed:', e.message);
}

try {
    const m2 = game.move('e4');
    console.log('Move success (string):', m2);
} catch(e) {
    console.error('String move failed. ', e.message);
}
