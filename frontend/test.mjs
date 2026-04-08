import { io } from "socket.io-client";

const socket = io("http://localhost:3001", { transports: ['websocket'] });

console.log("Connecting...");

socket.on("connect", () => {
    console.log("CONNECTED SID", socket.id);
    socket.emit("startJungleGame", { roomId: "local", mode: "solo", difficulty: "medium" });
});

socket.on("jungleGameStarted", (data) => {
    console.log("STARTED", data);
    process.exit(0);
});

socket.on("connect_error", (err) => {
    console.log("ERR", err.message);
    process.exit(1);
});

setTimeout(() => { 
    console.log("TIMEOUT"); 
    process.exit(1); 
}, 3000);
