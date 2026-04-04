/**
 * SUDOKU - Unit Tests
 * Tests for: isValid, solveBoard, generateFullBoard, generateSudoku
 */
import { describe, it, expect } from 'vitest';
import { isValid, solveBoard, generateFullBoard, generateSudoku, BLANK } from '../utils/sudoku';

// Helper: check if a board is valid (no duplicates in rows, cols, or 3x3 boxes)
function isBoardValid(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = board[r][c];
            if (val !== BLANK) {
                if (!isValid(board, r, c, val)) return false;
            }
        }
    }
    return true;
}

// Helper: check if a board is full
function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== BLANK));
}

describe('Sudoku Utility Logic', () => {
    
    describe('isValid()', () => {
        it('should return true for a valid move on empty board', () => {
            const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
            expect(isValid(board, 0, 0, 5)).toBe(true);
        });

        it('should return false if number exists in same row', () => {
            const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
            board[0][5] = 5;
            expect(isValid(board, 0, 0, 5)).toBe(false);
        });

        it('should return false if number exists in same column', () => {
            const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
            board[5][0] = 5;
            expect(isValid(board, 0, 0, 5)).toBe(false);
        });

        it('should return false if number exists in same 3x3 box', () => {
            const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
            board[1][1] = 5;
            expect(isValid(board, 0, 0, 5)).toBe(false);
        });
    });

    describe('solveBoard()', () => {
        it('should solve a simple puzzle', () => {
            const board = [
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
            const solved = solveBoard(board);
            expect(solved).toBe(true);
            expect(isBoardFull(board)).toBe(true);
            expect(isBoardValid(board)).toBe(true);
        });
    });

    describe('generateFullBoard()', () => {
        it('should generate a valid, full board', () => {
            const board = generateFullBoard();
            expect(isBoardFull(board)).toBe(true);
            expect(isBoardValid(board)).toBe(true);
        });
    });

    describe('generateSudoku()', () => {
        it('should return a puzzle and a solution', () => {
            const { puzzle, solution } = generateSudoku('Medium');
            expect(puzzle).toBeDefined();
            expect(solution).toBeDefined();
            expect(isBoardValid(puzzle)).toBe(true);
            expect(isBoardValid(solution)).toBe(true);
            expect(isBoardFull(solution)).toBe(true);
        });

        it('should have some blanks in the puzzle', () => {
            const { puzzle } = generateSudoku('Easy');
            const blanks = puzzle.flat().filter(v => v === BLANK).length;
            expect(blanks).toBeGreaterThan(0);
        });

        it('Expert difficulty should have more blanks than Easy', () => {
            const { puzzle: easyPuzzle } = generateSudoku('Easy');
            const { puzzle: expertPuzzle } = generateSudoku('Expert');
            
            const easyBlanks = easyPuzzle.flat().filter(v => v === BLANK).length;
            const expertBlanks = expertPuzzle.flat().filter(v => v === BLANK).length;
            
            expect(expertBlanks).toBeGreaterThan(easyBlanks);
        });
    });
});
