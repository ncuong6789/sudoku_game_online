import React from 'react';
import { Eraser, Lightbulb, Pencil } from 'lucide-react';

export default function Controls({ onNumberClick, onActionClick, notesMode, completedNumbers = [] }) {
    return (
        <div className="controls-panel-premium">
            <div className="action-buttons-premium">
                <button className="btn-action-premium" onClick={() => onActionClick('erase')}>
                    <Eraser size={20} />
                    <span>Xóa</span>
                </button>
                <button className={`btn-action-premium ${notesMode ? 'active-glow' : ''}`} onClick={() => onActionClick('notes')}>
                    <Pencil size={20} className={notesMode ? 'pencil-wiggle' : ''} />
                    <span>Nháp {notesMode ? 'BẬT' : 'TẮT'}</span>
                </button>
                <button className="btn-action-premium" onClick={() => onActionClick('hint')}>
                    <Lightbulb size={20} />
                    <span>Gợi ý</span>
                </button>
            </div>
            
            <div className="numpad-premium">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button
                        key={n}
                        className={`btn-num-premium ${completedNumbers.includes(n) ? 'num-completed' : ''}`}
                        onClick={() => !completedNumbers.includes(n) && onNumberClick(n)}
                        disabled={completedNumbers.includes(n)}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </div>
    );
}
