import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '', displayName: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let res;
        if (isLogin) {
            res = await login(formData.username, formData.password);
        } else {
            res = await register(formData.username, formData.password, formData.displayName);
        }

        setLoading(false);

        if (res.success) {
            onClose();
        } else {
            setError(res.error);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setFormData({ username: '', password: '', displayName: '' });
        setShowPassword(false);
    };

    const inputStyle = {
        padding: '11px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: '#fff',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        fontSize: '0.95rem',
        transition: 'border-color 0.2s',
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                position: 'relative', width: '400px', maxWidth: '95vw', padding: '2rem',
                display: 'flex', flexDirection: 'column', gap: '1.2rem',
                borderRadius: '20px', background: 'rgba(18, 20, 32, 0.98)',
                boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                {/* Close button */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: '14px', right: '14px',
                    background: 'rgba(255,255,255,0.08)', border: 'none',
                    color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <X size={20} />
                </button>

                {/* Title */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{isLogin ? '👋' : '🎮'}</div>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>
                        {isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                        {isLogin ? 'Đăng nhập để xem xếp hạng & bạn bè' : 'Miễn phí, không mất phí gì cả!'}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '10px 14px', background: 'rgba(239,68,68,0.12)',
                        color: '#f87171', borderRadius: '10px', fontSize: '0.88rem',
                        textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)'
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {!isLogin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Tên hiển thị</label>
                            <input type="text" name="displayName" value={formData.displayName}
                                onChange={handleChange} required style={inputStyle} />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Tài khoản</label>
                        <input type="text" name="username" value={formData.username}
                            onChange={handleChange} required placeholder="Tên đăng nhập"
                            autoComplete="username"
                            style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Mật khẩu</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password" value={formData.password}
                                onChange={handleChange} required placeholder="••••••••"
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                style={{ ...inputStyle, paddingRight: '44px' }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#64748b', padding: '2px', display: 'flex', alignItems: 'center'
                                }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} style={{
                        padding: '13px', marginTop: '4px', borderRadius: '10px',
                        fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                        background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: '#fff', border: 'none', transition: 'all 0.2s',
                        boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.4)'
                    }}>
                        {loading ? '⏳ Đang xử lý...' : (isLogin ? '🚀 Đăng Nhập' : '✨ Tạo Tài Khoản')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#64748b' }}>
                    {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <span onClick={switchMode}
                        style={{ color: '#4ade80', cursor: 'pointer', fontWeight: 700 }}>
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                </div>
            </div>
        </div>
    );
}
