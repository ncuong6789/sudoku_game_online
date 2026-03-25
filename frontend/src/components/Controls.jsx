import React from 'react';
import { Eraser, Lightbulb, Pencil } from 'lucide-react';

export default function Controls({ onNumberClick, onActionClick, notesMode, completedNumbers = [] }) {
    return (
        <>
            <div className="action-buttons">
                <button className="btn-action" onClick={() => onActionClick('erase')}>
                    <Eraser size={20} />
                    <span>Erase</span>
                </button>
                <button className={`btn-action ${notesMode ? 'active' : ''}`} onClick={() => onActionClick('notes')}>
                    <Pencil size={20} />
                    <span>Notes {notesMode ? 'On' : 'Off'}</span>
                </button>
                <button className="btn-action" onClick={() => onActionClick('hint')}>
                    <Lightbulb size={20} />
                    <span>Hint</span>
                </button>
            </div>
            <div className="numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button
                        key={n}
                        className="btn-num"
                        onClick={() => onNumberClick(n)}
                        style={{ visibility: completedNumbers.includes(n) ? 'hidden' : 'visible' }}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </>
    );
}
