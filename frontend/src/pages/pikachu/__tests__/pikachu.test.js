/**
 * PIKACHU ONET - Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
    findPath,
    hasValidPair,
    shuffleBoard,
    applyLevelMovement,
    generateInitialBoard,
} from '../usePikachuLogic';

const ROWS = 16;
const COLS = 16;
const R = ROWS + 2;
const C = COLS + 2;

function emptyBoard() {
    return Array.from({ length: R }, () => Array(C).fill(0));
}

function place(board, r, c, val) {
    const b = board.map(row => [...row]);
    b[r][c] = val;
    return b;
}

describe('findPath()', () => {
    it('returns null when same tile clicked twice', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 5);
        expect(findPath(b, { r: 1, c: 1 }, { r: 1, c: 1 })).toBeNull();
    });

    it('returns null when tiles have different values', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 5);
        b = place(b, 1, 3, 7);
        expect(findPath(b, { r: 1, c: 1 }, { r: 1, c: 3 })).toBeNull();
    });

    it('finds path for same-row connection (direct line)', () => {
        let b = emptyBoard();
        b = place(b, 2, 1, 3);
        b = place(b, 2, 3, 3);
        const path = findPath(b, { r: 2, c: 1 }, { r: 2, c: 3 });
        expect(path).not.toBeNull();
    });

    it('finds path for same-column connection (direct line)', () => {
        let b = emptyBoard();
        b = place(b, 1, 4, 9);
        b = place(b, 4, 4, 9);
        const path = findPath(b, { r: 1, c: 4 }, { r: 4, c: 4 });
        expect(path).not.toBeNull();
    });

    it('finds L-shaped path (1 turn)', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 11);
        b = place(b, 3, 3, 11);
        const path = findPath(b, { r: 1, c: 1 }, { r: 3, c: 3 });
        expect(path).not.toBeNull();
        expect(path.length).toBe(3);
    });

    it('finds U-shaped path (2 turns) via boundary', () => {
        let b = emptyBoard();
        b = place(b, 2, 1, 20);
        b = place(b, 2, 4, 20);
        b = place(b, 2, 2, 99);
        b = place(b, 2, 3, 99);
        const path = findPath(b, { r: 2, c: 1 }, { r: 2, c: 4 });
        expect(path).not.toBeNull();
    });
});

describe('hasValidPair()', () => {
    it('returns "win" for fully empty board', () => {
        expect(hasValidPair(emptyBoard())).toBe('win');
    });

    it('returns [p1, p2] when a valid connectable pair exists', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 5);
        b = place(b, 1, 3, 5);
        const result = hasValidPair(b);
        expect(result).not.toBeNull();
        expect(result).not.toBe('win');
        expect(Array.isArray(result)).toBe(true);
    });
});

describe('shuffleBoard()', () => {
    it('keeps same tile count after shuffle', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 5); b = place(b, 2, 2, 5);
        const countTiles = (board) => board.flat().filter(v => v !== 0).length;
        const before = countTiles(b);
        const shuffled = shuffleBoard(b);
        expect(countTiles(shuffled)).toBe(before);
    });
});

describe('applyLevelMovement()', () => {
    it('Mode 0 (Static): removes tiles, does not shift', () => {
        let b = emptyBoard();
        b = place(b, 5, 1, 9);
        const result = applyLevelMovement(b, { r: 5, c: 1 }, { r: 5, c: 3 }, 1);
        expect(result[5][1]).toBe(0);
    });
});

describe('generateInitialBoard()', () => {
    it('generates board with correct dimensions', () => {
        const b = generateInitialBoard();
        expect(b.length).toBe(R);
        expect(b[0].length).toBe(C);
    });
});
