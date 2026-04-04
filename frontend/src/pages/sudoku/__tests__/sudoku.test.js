/**
 * SUDOKU - Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
    isValid,
    solveBoard,
    generateFullBoard,
    generateSudoku,
} from '../useSudokuLogic'; // Assuming core logic is here or in a separate utils file

// If logic is in src/utils/sudoku.js, import from there
import * as sudokuUtils from '../../../utils/sudoku';

describe('Sudoku Utils (isValid)', () => {
    const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(0));

    it('returns true on valid empty board cell', () => {
        expect(sudokuUtils.isValid(emptyBoard(), 0, 0, 5)).toBe(true);
    });

    it('returns false if value exists in same row', () => {
        let b = emptyBoard();
        b[0][5] = 9;
        expect(sudokuUtils.isValid(b, 0, 0, 9)).toBe(false);
    });

    it('returns false if value exists in same column', () => {
        let b = emptyBoard();
        b[5][0] = 9;
        expect(sudokuUtils.isValid(b, 0, 0, 9)).toBe(false);
    });

    it('returns false if value exists in 3x3 box', () => {
        let b = emptyBoard();
        b[1][1] = 9;
        expect(sudokuUtils.isValid(b, 0, 0, 9)).toBe(false);
    });
});

describe('Sudoku Utils (Solving)', () => {
    it('solves a solvable board', () => {
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
        const success = sudokuUtils.solveBoard(b);
        expect(success).toBe(true);
        expect(b[0][2]).toBe(4);
    });
});

describe('Sudoku Utils (Generation)', () => {
    it('generates a full board correctly', () => {
        const b = sudokuUtils.generateFullBoard();
        expect(b.flat().filter(v => v === 0).length).toBe(0);
    });

    it('generates a puzzle and solution', () => {
        const { puzzle, solution } = sudokuUtils.generateSudoku('Easy');
        expect(puzzle).not.toBeNull();
        expect(solution).not.toBeNull();
        expect(puzzle.flat().includes(0)).toBe(true);
    });
});
