export const BLANK = 0;

export function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num && i !== col) return false;
        if (board[i][col] === num && i !== row) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[startRow + i][startCol + j] === num && (startRow + i !== row || startCol + j !== col)) return false;
        }
    }
    return true;
}

export function solveBoard(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === BLANK || board[r][c] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (solveBoard(board)) return true;
                        board[r][c] = BLANK;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function fillBox(board, rowStart, colStart) {
    let num;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            do {
                num = Math.floor(Math.random() * 9) + 1;
            } while (!isValidInBox(board, rowStart, colStart, num));
            board[rowStart + i][colStart + j] = num;
        }
    }
}

function isValidInBox(board, rowStart, colStart, num) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[rowStart + i][colStart + j] === num) return false;
        }
    }
    return true;
}

function fillDiagonalBoxes(board) {
    for (let i = 0; i < 9; i = i + 3) {
        fillBox(board, i, i);
    }
}

export function generateFullBoard() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
    fillDiagonalBoxes(board);
    solveBoard(board);
    return board;
}

function hasUniqueSolution(board) {
    let count = 0;
    function solve() {
        if (count > 1) return;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === BLANK || board[r][c] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (isValid(board, r, c, num)) {
                            board[r][c] = num;
                            solve();
                            board[r][c] = BLANK;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    solve();
    return count === 1;
}

export function generateSudoku(difficulty) {
    const board = generateFullBoard();
    const solution = board.map(row => [...row]);

    let targetEmpty = 40;
    switch (difficulty) {
        case 'Easy': targetEmpty = 45; break;   // 36 clues
        case 'Medium': targetEmpty = 51; break; // 30 clues
        case 'Hard': targetEmpty = 56; break;   // 25 clues
        case 'Expert': targetEmpty = 60; break; // 21 clues
        default: targetEmpty = 50;
    }

    let puzzle = board.map(row => [...row]);
    let cells = [];
    for (let i = 0; i < 81; i++) cells.push(i);
    cells.sort(() => Math.random() - 0.5);

    let emptyCount = 0;
    for (let cell of cells) {
        if (emptyCount >= targetEmpty) break;

        let r = Math.floor(cell / 9);
        let c = cell % 9;

        if (puzzle[r][c] !== BLANK) {
            let backup = puzzle[r][c];
            puzzle[r][c] = BLANK;

            let copy = puzzle.map(row => [...row]);
            if (!hasUniqueSolution(copy)) {
                puzzle[r][c] = backup; // rollback
            } else {
                emptyCount++;
            }
        }
    }

    return { puzzle, solution };
}
