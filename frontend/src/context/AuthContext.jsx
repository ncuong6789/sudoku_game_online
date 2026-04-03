import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('gameonl_token') || null);

    const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    useEffect(() => {
        if (token) {
            localStorage.setItem('gameonl_token', token);
            fetchProfile(token);
        } else {
            localStorage.removeItem('gameonl_token');
            setUser(null);
        }
    }, [token]);

    const fetchProfile = async (currentToken) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                setToken(null);
            }
        } catch (err) {
            console.error('Lỗi khi fetch profile:', err);
        }
    };

    const login = async (username, password) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                setToken(data.token);
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Không thể kết nối đến máy chủ.' };
        }
    };

    const register = async (username, password, displayName) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, displayName })
            });
            const data = await res.json();
            if (res.ok) {
                setToken(data.token);
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Không thể kết nối đến máy chủ.' };
        }
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, API_URL }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
