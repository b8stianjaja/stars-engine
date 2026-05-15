// sync-server.cjs
const { Server } = require("socket.io");

const io = new Server(3001, {
    cors: { origin: "*" } // Permite conexión de cualquier IP en la LAN
});

io.on("connection", (socket) => {
    console.log("PC Conectado:", socket.id);

    // Reenviar trazos de dibujo del Artista al Programador
    socket.on("ARTIST_STROKE", (data) => {
        socket.broadcast.emit("REMOTE_STROKE", data);
    });

    // Reenviar cambios de lógica/entidades del Programador al Artista
    socket.on("ENGINE_UPDATE", (data) => {
        socket.broadcast.emit("REMOTE_ENGINE_UPDATE", data);
    });
});

console.log("Stars Engine Sync Bridge corriendo en puerto 3001");