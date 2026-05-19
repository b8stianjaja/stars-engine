const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const io = new Server(3001, {
    cors: { origin: "*" },
    transports: ["websocket"]
});

const drawingsDir = path.join(__dirname, "public", "drawings");
if (!fs.existsSync(drawingsDir)) {
    fs.mkdirSync(drawingsDir, { recursive: true });
}

io.on("connection", (socket) => {
    console.log(`[LAN Server] Conexión establecida desde nodo: ${socket.id}`);

    // Canalizador de Latencia Nativa
    socket.on("NET_PING", (callback) => {
        if (typeof callback === "function") callback();
    });

    // Orquestación de Entidades e Instanciación
    socket.on("NET_ENTITY_CREATE", (data) => {
        socket.broadcast.emit("SERVER_ENTITY_CREATE", data);
    });

    socket.on("NET_ENTITY_DELETE", (data) => {
        socket.broadcast.emit("SERVER_ENTITY_DELETE", data);
    });

    // Enrutadores de Transformación Físicas y Gizmos en Caliente
    socket.on("NET_ENTITY_TRANSFORM", (data) => {
        socket.broadcast.emit("SERVER_ENTITY_TRANSFORM", data);
    });

    // Transmisión de Código Fuente de Monaco Editor en Tiempo Real
    socket.on("NET_ENTITY_SCRIPT", (data) => {
        socket.broadcast.emit("SERVER_ENTITY_SCRIPT", data);
    });

    // Sincronización de Variables de Inspector Reflectivo
    socket.on("NET_ENTITY_PROPERTY", (data) => {
        socket.broadcast.emit("SERVER_ENTITY_PROPERTY", data);
    });

    // Orquestación de Escenas y Carga Global de Bundles Storyboard (.stars)
    socket.on("NET_SCENE_CREATE", (data) => {
        socket.broadcast.emit("SERVER_SCENE_CREATE", data);
    });

    socket.on("NET_SCENE_SWITCH", (data) => {
        socket.broadcast.emit("SERVER_SCENE_SWITCH", data);
    });

    socket.on("NET_STORYBOARD_HYDRATE", (data) => {
        socket.broadcast.emit("SERVER_STORYBOARD_HYDRATE", data);
    });

    // Preservación y Flujo de Arte Ilustrado 2.5D
    socket.on("ARTIST_STROKE", (data) => {
        socket.broadcast.emit("REMOTE_STROKE", data);
    });

    socket.on("SAVE_CANVAS", (data) => {
        const { entityId, imageData } = data;
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        fs.writeFile(path.join(drawingsDir, `${entityId}.png`), base64Data, "base64", (err) => {
            if (!err) console.log(`[LAN Server] Canvas Persistido: ${entityId}.png`);
        });
    });

    socket.on("disconnect", () => {
        console.log(`[LAN Server] Nodo desconectado: ${socket.id}`);
    });
});

console.log("🚀 Servidor Core de Sincronización STARS LAN activo en puerto 3001");