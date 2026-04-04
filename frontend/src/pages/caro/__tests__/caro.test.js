/**
 * CARO (Gomoku) 15x15 / 3x3 - Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { checkWinner, getFilledCellsCount } from '../caroAI';

describe('Caro Logic (15x15)', () => {
  it('detects horizontal win (5 in a row)', () => {
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    for (let c = 0; c < 5; c++) board[0][c] = 'X';
    expect(checkWinner(board, 0, 4, 15)).toBe('X');
  });

  it('detects vertical win (5 in a column)', () => {
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    for (let r = 0; r < 5; r++) board[r][0] = 'O';
    expect(checkWinner(board, 4, 0, 15)).toBe('O');
  });

  it('detects diagonal (desc) win', () => {
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    for (let i = 0; i < 5; i++) board[i][i] = 'X';
    expect(checkWinner(board, 4, 4, 15)).toBe('X');
  });

  it('detects diagonal (asc) win', () => {
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    for (let i = 0; i < 5; i++) board[4-i][i] = 'O';
    expect(checkWinner(board, 0, 4, 15)).toBe('O');
  });

  it('returns null when no winner', () => {
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    board[0][0] = 'X'; board[0][1] = 'O';
    expect(checkWinner(board, 0, 1, 15)).toBeNull();
  });
});

describe('Caro Logic (3x3)', () => {
  it('detects 3-in-a-row winner', () => {
    const board = Array(3).fill(null).map(() => Array(3).fill(null));
    board[0][0] = 'X'; board[0][1] = 'X'; board[0][2] = 'X';
    expect(checkWinner(board, 0, 2, 3)).toBe('X');
  });
});

describe('getFilledCellsCount()', () => {
  it('counts correctly', () => {
    const board = Array(3).fill(null).map(() => Array(3).fill(null));
    board[0][0] = 'X'; board[1][1] = 'O';
    expect(getFilledCellsCount(board)).toBe(2);
  });
});
