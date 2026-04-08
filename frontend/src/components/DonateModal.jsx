import React, { useState } from 'react';
import { X, Heart, Copy, Check, ExternalLink } from 'lucide-react';

// CẤU HÌNH TÀI KHOẢN CỦA BẠN TẠI ĐÂY
const DONATE_CONFIG = {
    bankId: 'TCB', // Techcombank
    accountNo: '19038495256012', // Số tài khoản mới
    accountName: 'NGUYEN LE HUNG CUONG',
    description: 'Ung ho GameOnl',
};

export default function DonateModal({ isOpen, onClose }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const qrUrl = `https://img.vietqr.io/image/${DONATE_CONFIG.bankId}-${DONATE_CONFIG.accountNo}-compact2.png?amount=50000&addInfo=${encodeURIComponent(DONATE_CONFIG.description)}&accountName=${encodeURIComponent(DONATE_CONFIG.accountName)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(DONATE_CONFIG.accountNo);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 10, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '32px',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
                boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                >
                    <X size={18} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div className="heart-pulse" style={{
                        width: '50px', height: '50px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 0.8rem auto',
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
                    }}>
                        <Heart size={28} fill="#ef4444" color="#ef4444" />
                    </div>
                    <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Ủng hộ dự án</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        Giúp mình duy trì server và phát triển game nhé. ❤️
                    </p>
                </div>

                {/* QR Code Section */}
                <div style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '1rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '10px',
                        borderRadius: '16px',
                        width: '280px', height: '280px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src={qrUrl}
                            alt="VietQR"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/280?text=QR+Error';
                            }}
                        />
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Số tài khoản ({DONATE_CONFIG.bankId})</span>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{DONATE_CONFIG.accountNo}</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                style={{
                                    background: copied ? '#4ade8022' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: copied ? '#4ade80' : '#fff',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{copied ? 'Xong' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '0.8rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.4)',
                            padding: '8px 20px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        Đóng
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .heart-pulse { animation: pulse 2s infinite; }
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}

