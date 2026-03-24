import React from 'react';

export default function Board({ userAnswers, notes, selectedCell, setSelectedCell, initialPuzzle, errors }) {
    const getCellClass = (r, c) => {
        let classes = ['cell'];
        if (c === 2 || c === 5) classes.push('right-border');
        if (r === 2 || r === 5) classes.push('bottom-border');
        if (initialPuzzle[r][c] !== 0) classes.push('fixed');

        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
            classes.push('selected');
        } else if (selectedCell && (selectedCell.r === r || selectedCell.c === c ||
            (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && Math.floor(selectedCell.c / 3) === Math.floor(c / 3)))) {
            classes.push('highlighted-region');
        }

        let val = initialPuzzle[r][c] !== 0 ? initialPuzzle[r][c] : userAnswers[r][c];
        if (selectedCell && val !== 0 && val !== undefined) {
            let selVal = initialPuzzle[selectedCell.r][selectedCell.c] !== 0 ? initialPuzzle[selectedCell.r][selectedCell.c] : userAnswers[selectedCell.r][selectedCell.c];
            if (selVal === val && !(selectedCell.r === r && selectedCell.c === c)) {
                classes.push('highlighted-same-number');
            }
        }

        if (errors && errors[`${r}-${c}`]) classes.push('error-cell');

        return classes.join(' ');
    };

    return (
        <div className="sudoku-board">
            {initialPuzzle.map((row, r) =>
                row.map((cell, c) => {
                    let val = initialPuzzle[r][c] !== 0 ? initialPuzzle[r][c] : userAnswers[r][c];
                    let cellNotes = notes[`${r}-${c}`] || [];

                    return (
                        <div
                            key={`${r}-${c}`}
                            className={getCellClass(r, c)}
                            onClick={() => setSelectedCell({ r, c })}
                        >
                            {val !== 0 ? val : (
                                cellNotes.length > 0 && (
                                    <div className="notes-grid">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                            <div key={n} className="note-cell">
                                                {cellNotes.includes(n) ? n : ''}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
