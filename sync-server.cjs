const { Server } = require("socket.io"); //
const fs = require("fs"); //
const path = require("path"); //

// Configurado estrictamente en el puerto 3001
const io = new Server(3001, { cors: { origin: "*" } }); //
const drawingsDir = path.join(__dirname, "public", "drawings"); //

if (!fs.existsSync(drawingsDir)) fs.mkdirSync(drawingsDir, { recursive: true }); //

io.on("connection", (socket) => {
    socket.on("ARTIST_STROKE", (data) => socket.broadcast.emit("REMOTE_STROKE", data)); //
    socket.on("ENGINE_UPDATE", (data) => socket.broadcast.emit("REMOTE_ENGINE_UPDATE", data)); //

    socket.on("SAVE_CANVAS", (data) => {
        const { entityId, imageData } = data; //
        const base64Data = imageData.replace(/^data:image\/png;base64,/, ""); //
        fs.writeFile(path.join(drawingsDir, `${entityId}.png`), base64Data, "base64", (err) => { //
            if (!err) console.log(`💾 Persistido: ${entityId}.png`); //
        });
    });
});

console.log("🚀 Bridge LAN activo en puerto 3001"); //