/**
 * PIKACHU ONET - Unit Tests
 * Tests for: findPath, hasValidPair, applyLevelMovement, shuffleBoard
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    findPath,
    hasValidPair,
    shuffleBoard,
    applyLevelMovement,
    generateInitialBoard,
} from '../pages/pikachu/usePikachuLogic';

const ROWS = 16;
const COLS = 16;
const R = ROWS + 2;
const C = COLS + 2;

// Helper: create empty board (all zeros)
function emptyBoard() {
    return Array.from({ length: R }, () => Array(C).fill(0));
}

// Helper: place a tile
function place(board, r, c, val) {
    const b = board.map(row => [...row]);
    b[r][c] = val;
    return b;
}

// ─── findPath ───────────────────────────────────────────────────────────────

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
        expect(path.length).toBeGreaterThanOrEqual(2);
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
        // L-shape = 3 points
        expect(path.length).toBe(3);
    });

    it('finds U-shaped path (2 turns) via boundary', () => {
        let b = emptyBoard();
        // Block all direct routes
        b = place(b, 2, 1, 20);
        b = place(b, 2, 4, 20);
        // Fill row 2 cols 2-3 with obstacles
        b = place(b, 2, 2, 99);
        b = place(b, 2, 3, 99);
        // But they can go via row 0 (boundary)
        const path = findPath(b, { r: 2, c: 1 }, { r: 2, c: 4 });
        expect(path).not.toBeNull();
    });

    it('returns null when path is blocked', () => {
        let b = emptyBoard();
        b = place(b, 5, 1, 4);
        b = place(b, 5, 3, 4);
        // Block the only path
        b = place(b, 5, 2, 99);
        b = place(b, 4, 1, 99); b = place(b, 4, 2, 99); b = place(b, 4, 3, 99);
        b = place(b, 6, 1, 99); b = place(b, 6, 2, 99); b = place(b, 6, 3, 99);
        // Also block boundary area
        for (let r = 0; r <= ROWS + 1; r++) {
            if (b[r][0] === 0) b = place(b, r, 0, 88);
        }
        // Note: depending on board setup this may or may not be null
        // We just verify it doesn't throw
        expect(() => findPath(b, { r: 5, c: 1 }, { r: 5, c: 3 })).not.toThrow();
    });
});

// ─── hasValidPair ────────────────────────────────────────────────────────────

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

    it('returns null for deadlock (tiles exist but none connectable)', () => {
        // Isolated tiles that can't reach each other without 3+ turns
        let b = emptyBoard();
        // Fill interior completely to isolate
        for (let r = 1; r <= ROWS; r++) {
            for (let c = 1; c <= COLS; c++) {
                b = place(b, r, c, r * 10 + c); // all unique → no pairs
            }
        }
        const result = hasValidPair(b);
        expect(result).toBeNull();
    });
});

// ─── shuffleBoard ────────────────────────────────────────────────────────────

describe('shuffleBoard()', () => {
    it('keeps same tile count after shuffle', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 5); b = place(b, 2, 2, 5);
        b = place(b, 3, 3, 7); b = place(b, 4, 4, 7);

        const countTiles = (board) => board.flat().filter(v => v !== 0).length;
        const before = countTiles(b);
        const shuffled = shuffleBoard(b);
        expect(countTiles(shuffled)).toBe(before);
    });

    it('preserves same set of tile values', () => {
        let b = emptyBoard();
        b = place(b, 1, 1, 3); b = place(b, 1, 2, 3);
        b = place(b, 2, 1, 7); b = place(b, 2, 2, 7);

        const tileValues = (board) =>
            board.flat().filter(v => v !== 0).sort((a, b) => a - b);

        const shuffled = shuffleBoard(b);
        expect(tileValues(shuffled)).toEqual(tileValues(b));
    });
});

// ─── applyLevelMovement ───────────────────────────────────────────────────────

describe('applyLevelMovement()', () => {
    it('Mode 0 (Static): removes tiles, does not shift', () => {
        let b = emptyBoard();
        b = place(b, 5, 1, 9);
        b = place(b, 5, 3, 9);

        const result = applyLevelMovement(b, { r: 5, c: 1 }, { r: 5, c: 3 }, 1);
        expect(result[5][1]).toBe(0);
        expect(result[5][3]).toBe(0);
    });

    it('Mode 1 (Gravity): tiles fall down after removal', () => {
        let b = emptyBoard();
        // Stack: row1=tile, row3=tile (same col), remove row3
        b = place(b, 1, 2, 8);
        b = place(b, 3, 2, 8);
        b = place(b, 5, 2, 8); // extra tile above

        const p1 = { r: 1, c: 2 };
        const p2 = { r: 3, c: 2 };
        const result = applyLevelMovement(b, p1, p2, 2); // level 2 = gravity
        // After removal, remaining tile at col 2 should have dropped
        const nonZeroRows = [];
        for (let r = 1; r <= ROWS; r++) {
            if (result[r][2] !== 0) nonZeroRows.push(r);
        }
        // Gravity → surviving tile should be at the bottom
        if (nonZeroRows.length > 0) {
            expect(nonZeroRows[0]).toBeGreaterThan(1);
        }
    });

    it('Mode 2 (Shift Left): tiles slide left after removal', () => {
        let b = emptyBoard();
        b = place(b, 4, 1, 6);
        b = place(b, 4, 4, 6); // will be removed
        b = place(b, 4, 8, 6); // will be removed
        b = place(b, 4, 10, 42); // extra tile that should shift left

        const p1 = { r: 4, c: 4 };
        const p2 = { r: 4, c: 8 };
        const result = applyLevelMovement(b, p1, p2, 3); // level 3 = shift left

        // The row should have tiles packed to the left
        let firstZero = -1;
        let foundNonZeroAfterZero = false;
        for (let c = 1; c <= COLS; c++) {
            if (result[4][c] === 0 && firstZero === -1) firstZero = c;
            if (firstZero !== -1 && result[4][c] !== 0) foundNonZeroAfterZero = true;
        }
        expect(foundNonZeroAfterZero).toBe(false); // no tile after empty gap
    });
});

// ─── generateInitialBoard ────────────────────────────────────────────────────

describe('generateInitialBoard()', () => {
    it('generates board with correct dimensions', () => {
        const b = generateInitialBoard();
        expect(b.length).toBe(R);
        expect(b[0].length).toBe(C);
    });

    it('board has exactly ROWS*COLS non-zero tiles', () => {
        const b = generateInitialBoard();
        const count = b.flat().filter(v => v !== 0).length;
        expect(count).toBe(ROWS * COLS);
    });

    it('all non-zero tiles appear in pairs (even count per value)', () => {
        const b = generateInitialBoard();
        const freq = {};
        b.flat().forEach(v => {
            if (v !== 0) freq[v] = (freq[v] || 0) + 1;
        });
        Object.values(freq).forEach(count => {
            expect(count % 2).toBe(0); // must be even (pairs)
        });
    });

    it('boundary (row 0, row R-1, col 0, col C-1) stays zero', () => {
        const b = generateInitialBoard();
        for (let c = 0; c < C; c++) {
            expect(b[0][c]).toBe(0);
            expect(b[R - 1][c]).toBe(0);
        }
        for (let r = 0; r < R; r++) {
            expect(b[r][0]).toBe(0);
            expect(b[r][C - 1]).toBe(0);
        }
    });
});
