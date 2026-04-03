import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: true,
    transports: ['websocket'],
    auth: (cb) => {
        cb({ token: localStorage.getItem('gameonl_token') });
    }
});
