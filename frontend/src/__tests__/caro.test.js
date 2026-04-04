/**
 * CARO (Gomoku) - Unit Tests
 * Tests for: checkWinner, getFilledCellsCount
 */
import { describe, it, expect } from 'vitest';
import { checkWinner, getFilledCellsCount } from '../pages/caro/caroAI';

const BOARD_SIZE = 15;
const P1 = 1, P2 = 2;

// Helper: empty 15x15 board
function emptyBoard(size = BOARD_SIZE) {
    return Array.from({ length: size }, () => Array(size).fill(0));
}

// ─── checkWinner ─────────────────────────────────────────────────────────────

describe('checkWinner()', () => {
    it('returns null on empty board', () => {
        const board = emptyBoard();
        expect(checkWinner(board, 7, 7, P1, BOARD_SIZE)).toBeNull();
    });

    it('detects horizontal 5-in-a-row', () => {
        const board = emptyBoard();
        // Place P1 at row 5, cols 3-7
        [3, 4, 5, 6, 7].forEach(c => board[5][c] = P1);
        const result = checkWinner(board, 5, 5, P1, BOARD_SIZE);
        expect(result).not.toBeNull();
        expect(result.player).toBe(P1);
        expect(result.line.length).toBe(5);
    });

    it('detects vertical 5-in-a-row', () => {
        const board = emptyBoard();
        [3, 4, 5, 6, 7].forEach(r => board[r][5] = P2);
        const result = checkWinner(board, 5, 5, P2, BOARD_SIZE);
        expect(result).not.toBeNull();
        expect(result.player).toBe(P2);
    });

    it('detects diagonal (top-left to bottom-right) 5-in-a-row', () => {
        const board = emptyBoard();
        [0, 1, 2, 3, 4].forEach(i => board[3 + i][3 + i] = P1);
        const result = checkWinner(board, 5, 5, P1, BOARD_SIZE);
        expect(result).not.toBeNull();
        expect(result.player).toBe(P1);
    });

    it('detects anti-diagonal (top-right to bottom-left) 5-in-a-row', () => {
        const board = emptyBoard();
        [0, 1, 2, 3, 4].forEach(i => board[3 + i][10 - i] = P2);
        const result = checkWinner(board, 5, 8, P2, BOARD_SIZE);
        expect(result).not.toBeNull();
        expect(result.player).toBe(P2);
    });

    it('returns null for only 4-in-a-row', () => {
        const board = emptyBoard();
        [3, 4, 5, 6].forEach(c => board[5][c] = P1);
        const result = checkWinner(board, 5, 4, P1, BOARD_SIZE);
        expect(result).toBeNull();
    });

    it('returns null when last move does not complete line', () => {
        const board = emptyBoard();
        // P1 has 5 in a row but last move is at different location
        [3, 4, 5, 6, 7].forEach(c => board[5][c] = P1);
        board[5][3] = P1; // manually set
        // Check a move at position not in the line
        const result = checkWinner(board, 2, 2, P1, BOARD_SIZE);
        expect(result).toBeNull();
    });

    it('works with 3x3 board (tic-tac-toe mode, 3-in-a-row)', () => {
        const board = emptyBoard(3);
        [0, 1, 2].forEach(c => board[1][c] = P1);
        const result = checkWinner(board, 1, 1, P1, 3);
        expect(result).not.toBeNull();
        expect(result.player).toBe(P1);
    });

    it('does not confuse P1 and P2', () => {
        const board = emptyBoard();
        [3, 4, 5, 6, 7].forEach(c => board[5][c] = P1);
        // Check for P2 at the same row — should return null
        const result = checkWinner(board, 5, 5, P2, BOARD_SIZE);
        expect(result).toBeNull();
    });
});

// ─── getFilledCellsCount ─────────────────────────────────────────────────────

describe('getFilledCellsCount()', () => {
    it('returns 0 for empty board', () => {
        expect(getFilledCellsCount(emptyBoard(), BOARD_SIZE)).toBe(0);
    });

    it('counts filled cells correctly', () => {
        const board = emptyBoard();
        board[0][0] = P1;
        board[5][5] = P2;
        board[14][14] = P1;
        expect(getFilledCellsCount(board, BOARD_SIZE)).toBe(3);
    });

    it('counts full board as BOARD_SIZE^2', () => {
        const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(P1));
        expect(getFilledCellsCount(board, BOARD_SIZE)).toBe(BOARD_SIZE * BOARD_SIZE);
    });
});
