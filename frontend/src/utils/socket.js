import { io } from 'socket.io-client';

// Đổi URL này thành link backend của bạn sau khi bạn đưa phần BACKEND lên web (ví dụ: https://my-backend.onrender.com)
// Nếu để nguyên, nó sẽ mặc định kết nối với backend chạy trên máy tính bạn.
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: true,
    transports: ['websocket']
});
