import React from 'react';

export default function Board({ userAnswers, notes, selectedCell, setSelectedCell, initialPuzzle, errors }) {
    if (!initialPuzzle) return null;

    const getCellClass = (r, c) => {
        let classes = ['sudoku-cell-premium'];
        
        // Block coloring to distinguish 3x3 regions slightly
        const blockR = Math.floor(r / 3);
        const blockC = Math.floor(c / 3);
        const isDarkBlock = (blockR + blockC) % 2 !== 0;
        if (isDarkBlock) classes.push('block-dark');

        if (c === 2 || c === 5) classes.push('border-right-bold');
        if (r === 2 || r === 5) classes.push('border-bottom-bold');
        if (initialPuzzle[r][c] !== 0) classes.push('fixed-number');

        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
            classes.push('selected');
        } else if (selectedCell && (selectedCell.r === r || selectedCell.c === c ||
            (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && Math.floor(selectedCell.c / 3) === Math.floor(c / 3)))) {
            classes.push('highlighted-region');
        }

        let val = initialPuzzle[r][c] !== 0 ? initialPuzzle[r][c] : userAnswers[r][c];
        if (selectedCell && val !== 0 && val !== undefined) {
            let selVal = initialPuzzle[selectedCell.r][selectedCell.c] !== 0 
                ? initialPuzzle[selectedCell.r][selectedCell.c] 
                : userAnswers[selectedCell.r][selectedCell.c];
            if (selVal === val && !(selectedCell.r === r && selectedCell.c === c)) {
                classes.push('highlighted-same-number');
            }
        }

        if (errors && errors[`${r}-${c}`]) classes.push('error-cell-shake');

        return classes.join(' ');
    };

    return (
        <div className="sudoku-board-premium">
            {initialPuzzle.map((row, r) =>
                row.map((cell, c) => {
                    let val = initialPuzzle[r][c] !== 0 ? initialPuzzle[r][c] : userAnswers[r][c];
                    let cellNotes = notes[`${r}-${c}`] || [];
                    const isNewNumber = val !== 0 && initialPuzzle[r][c] === 0;

                    return (
                        <div
                            key={`${r}-${c}`}
                            className={getCellClass(r, c)}
                            onClick={() => setSelectedCell({ r, c })}
                        >
                            {val !== 0 ? (
                                <span className={isNewNumber ? 'pop-animation user-number' : ''}>{val}</span>
                            ) : (
                                cellNotes.length > 0 && (
                                    <div className="notes-grid-premium">
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
