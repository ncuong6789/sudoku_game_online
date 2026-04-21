import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function GlobalSettings() {
    const { i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    const toggleLanguage = () => {
        const nextLang = i18n.language.startsWith('en') ? 'vi' : 'en';
        i18n.changeLanguage(nextLang);
    };

    return (
        <div className="global-settings">
            <button 
                onClick={toggleTheme} 
                className="icon-btn" 
                title="Toggle Theme"
                style={{
                    background: 'transparent',
                    border: 'none',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                }}
            >
                {theme === 'dark' ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#64748b" />}
            </button>
            <button 
                onClick={toggleLanguage} 
                className="icon-btn lang-btn" 
                title="Change Language"
                style={{ 
                    background: 'transparent',
                    border: 'none',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                    fontWeight: 'bold', 
                    fontSize: '0.85rem' 
                }}
            >
                {i18n.language.startsWith('en') ? 'VI' : 'EN'}
            </button>
        </div>
    );
}
