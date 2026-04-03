import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '', displayName: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                position: 'relative', width: '380px', padding: '2rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem',
                borderRadius: '16px', background: 'rgba(23, 23, 33, 0.95)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ margin: 0, textAlign: 'center', color: '#fff', fontSize: '1.5rem' }}>
                    {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                </h2>

                {error && (
                    <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tên hiển thị</label>
                            <input
                                type="text" name="displayName" value={formData.displayName} onChange={handleChange} required
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                            />
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tài khoản</label>
                        <input
                            type="text" name="username" value={formData.username} onChange={handleChange} required
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Mật khẩu</label>
                        <input
                            type="password" name="password" value={formData.password} onChange={handleChange} required
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px', marginTop: '10px', borderRadius: '8px', fontWeight: 'bold' }}>
                        {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
                    {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <span 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ color: '#4ade80', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                </div>
            </div>
        </div>
    );
}
