export interface IUser {
    id: string;
    username?: string;
    displayName: string;
    score?: number;
    matchesPlayed?: number;
    matchesWon?: number;
}

export interface IRoom {
    id: string;
    gameType: string;
    players: IUser[];
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
    // Optional settings based on game
    gridSize?: number;
    difficulty?: string;
    mapSize?: number;
}

export interface ICaroGameState {
    board: number[][]; // 0: empty, 1: X, 2: O
    currentPlayer: 'X' | 'O';
    winner: 'X' | 'O' | 'Draw' | null;
    winningLine: {x: number, y: number}[] | null;
    movesCount: number;
}
