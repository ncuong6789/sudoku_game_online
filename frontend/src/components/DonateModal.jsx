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
                padding: '2.5rem',
                width: '100%',
                maxWidth: '440px',
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
                        top: '1.5rem',
                        right: '1.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: '10px',
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
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div className="heart-pulse" style={{
                        width: '70px', height: '70px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.2rem auto',
                        boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
                    }}>
                        <Heart size={36} fill="#ef4444" color="#ef4444" />
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Ủng hộ dự án</h2>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                        Sự đóng góp của bạn là động lực vô giá giúp mình duy trì server và phát triển thêm nhiều trò chơi thú vị. ❤️
                    </p>
                </div>

                {/* QR Code Section */}
                <div style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '1.5rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem'
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '12px',
                        borderRadius: '20px',
                        width: '240px', height: '240px',
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
                                e.target.src = 'https://via.placeholder.com/240?text=QR+Error';
                            }}
                        />
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Số tài khoản ({DONATE_CONFIG.bankId})</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{DONATE_CONFIG.accountNo}</span>
                            </div>
                            <button 
                                onClick={handleCopy}
                                style={{
                                    background: copied ? '#4ade8022' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: copied ? '#4ade80' : '#fff',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{copied ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                        </div>
                        
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                            Scan bằng ứng dụng Ngân hàng
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            padding: '10px 24px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        Để sau vậy
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

