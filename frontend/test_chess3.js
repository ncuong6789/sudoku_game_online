import { Chess } from 'chess.js';

const g1 = new Chess();
g1.move('e4');
g1.move('e5');

console.log('g1 history:', g1.history());

const g2 = new Chess(g1.fen());
console.log('g2 history:', g2.history());
