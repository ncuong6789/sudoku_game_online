const PIECE_TO_FEN = {
    'r_k': 'K', 'r_a': 'A', 'r_b': 'B', 'r_n': 'N', 'r_r': 'R', 'r_c': 'C', 'r_p': 'P',
    'b_k': 'k', 'b_a': 'a', 'b_b': 'b', 'b_n': 'n', 'b_r': 'r', 'b_c': 'c', 'b_p': 'p',
};

const FEN_TO_PIECE = {
    'K': 'r_k', 'A': 'r_a', 'B': 'r_b', 'N': 'r_n', 'R': 'r_r', 'C': 'r_c', 'P': 'r_p',
    'k': 'b_k', 'a': 'b_a', 'b': 'b_b', 'n': 'b_n', 'r': 'b_r', 'c': 'b_c', 'p': 'b_p',
};

export function boardToFen(board, turn) {
    const fenRows = [];
    for (let r = 0; r <= 9; r++) {
        let empty = 0;
        let rowStr = '';
        for (let c = 0; c <= 8; c++) {
            const piece = board[r][c];
            if (!piece) {
                empty++;
            } else {
                if (empty > 0) {
                    rowStr += empty;
                    empty = 0;
                }
                rowStr += PIECE_TO_FEN[piece] || '?';
            }
        }
        if (empty > 0) rowStr += empty;
        fenRows.push(rowStr);
    }
    const turnChar = turn === 'r' ? 'w' : 'b';
    return `${fenRows.join('/')} ${turnChar} - - 0 1`;
}

export function fenToBoard(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    const board = [];
    for (let r = 0; r < rows.length && r <= 9; r++) {
        const row = [];
        for (const ch of rows[r]) {
            if (ch >= '1' && ch <= '9') {
                for (let i = 0; i < parseInt(ch); i++) row.push(null);
            } else {
                row.push(FEN_TO_PIECE[ch] || null);
            }
        }
        while (row.length < 9) row.push(null);
        board.push(row);
    }
    while (board.length < 10) board.push(Array(9).fill(null));
    const turn = parts[1] === 'w' ? 'r' : 'b';
    return { board, turn };
}

const COL_NAMES = 'abcdefghi';

export function moveToUCI(fromR, fromC, toR, toC) {
    return `${COL_NAMES[fromC]}${9 - fromR}${COL_NAMES[toC]}${9 - toR}`;
}

export function uciToMove(uci) {
    const fromC = COL_NAMES.indexOf(uci[0]);
    const fromR = 9 - parseInt(uci[1]);
    const toC = COL_NAMES.indexOf(uci[2]);
    const toR = 9 - parseInt(uci[3]);
    return { fromR, fromC, toR, toC };
}
