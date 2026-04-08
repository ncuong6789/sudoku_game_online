const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
    transports: ['websocket']
});

console.log("Attempting to connect to backend...");

socket.on("connect", () => {
    console.log("Connected with id", socket.id);
    socket.emit("startJungleGame", { roomId: "local", mode: "solo", difficulty: "medium" });
    
    // Timeout in case server doesn't respond
    setTimeout(() => {
        console.log("Timeout waiting for jungleGameStarted");
        process.exit(1);
    }, 2000);
});

socket.on("jungleGameStarted", (data) => {
    console.log("GAME STARTED with turn:", data.turn);
    console.log("Pieces count:", data.pieces.length);
    process.exit(0);
});

socket.on("connect_error", (err) => {
    console.log("Connect error:", err.message);
    process.exit(1);
});
