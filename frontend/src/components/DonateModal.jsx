import React, { useState } from 'react';
import { X, Heart, Copy, Check, ExternalLink } from 'lucide-react';

// CẤU HÌNH TÀI KHOẢN CỦA BẠN TẠI ĐÂY
const DONATE_CONFIG = {
    bankId: 'Ngân hàng Techcombank', // Bank name
    accountNo: '19038495256012', 
    accountName: 'NGUYỆN LÊ HÙNG CƯỜNG',
    qrImage: '/qr-donate.png', // Hãy thay file ảnh bằng mã QR cố định của bạn (lưu trong folder public/)
    bankLogo: '/techcombank-logo.png' // Logo ngân hàng (lưu trong public/)
};

export default function DonateModal({ isOpen, onClose }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

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

                <div style={{ textAlign: 'center', marginBottom: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 0.4rem 0', fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                        Ủng hộ dự án 
                        <Heart className="heart-pulse" size={26} fill="#ef4444" color="#ef4444" />
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                        Giúp mình duy trì server và phát triển game nhé.
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
                        padding: '6px',
                        borderRadius: '16px',
                        width: '280px', height: '280px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src={DONATE_CONFIG.qrImage}
                            alt="Mã QR Donate"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/280?text=QR+Image+Missing';
                            }}
                        />
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* Bank Name & Logo */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                <img src={DONATE_CONFIG.bankLogo} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{DONATE_CONFIG.bankId}</span>
                            </div>
                            
                            {/* Account No & Copy */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>Số tài khoản</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', letterSpacing: '1px' }}>{DONATE_CONFIG.accountNo}</span>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        background: copied ? '#4ade8022' : 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: copied ? '#4ade80' : '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{copied ? 'Xong' : 'Copy'}</span>
                                </button>
                            </div>

                            {/* Account Name */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>Chủ tài khoản</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>{DONATE_CONFIG.accountName}</span>
                            </div>
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
                .heart-pulse { animation: pulse 1.5s infinite ease-in-out; }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    15% { transform: scale(1.25); }
                    30% { transform: scale(1); }
                    45% { transform: scale(1.25); }
                    60% { transform: scale(1); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

