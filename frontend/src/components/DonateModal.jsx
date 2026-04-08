import React from 'react';
import { X, Heart } from 'lucide-react';

export default function DonateModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '2rem',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.2rem',
                        right: '1.2rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '60px', height: '60px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem auto'
                    }}>
                        <Heart size={30} fill="#ef4444" color="#ef4444" />
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#fff' }}>Ủng hộ dự án</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Nếu bạn thấy GameOnl thú vị, hãy ủng hộ mình một ly cà phê nhé! Sự đóng góp của bạn giúp mình duy trì server và phát triển thêm game. ❤️
                    </p>
                </div>

                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '10px',
                        borderRadius: '16px',
                        width: '220px', height: '220px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                        <img
                            src="/donate_qr.png"
                            alt="Donate QR Code"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                    </div>

                    <div style={{ textAlign: 'center', width: '100%' }}>
                        {/* <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hoặc chuyển khoản qua Momo/ZaloPay</div>
                        <div style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            padding: '10px', 
                            borderRadius: '8px', 
                            fontFamily: 'monospace', 
                            fontSize: '1.2rem', 
                            fontWeight: 'bold',
                            letterSpacing: '2px',
                            color: '#4ade80'
                        }}>
                            0987123xyz
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
