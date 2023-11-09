// Import modules
const express = require("express");
const { appendFile, readFileSync } = require("fs");
const { createServer } = require("https");
const { networkInterfaces } = require("os");
const { join } = require("path");
const socketIO = require("socket.io");

// Log an event on journal
function journalLog ( event) {
    console.log(event);
    appendFile(join( __dirname, "journal"), event.replace(/(?<= ?).?\[\d+m/g, '') + "\n", err => {
        if (err) throw err;
    });
}

// Initialize Express app
const app = express();

// Read key and certificate files
const key = readFileSync(join( __dirname, "key.pem" ), "utf8");
const cert = readFileSync(join( __dirname, "cert.pem" ), "utf8");

// Set up HTTPS server
const credentials = {
    key: key,
    cert: cert
};
const server = createServer(credentials, app);

// Initialize socket
const io = socketIO(server);

// Get local IP address
const nets = networkInterfaces();
let address = "0.0.0.0";
Object.keys(nets).forEach((interface) => {
    nets[interface].forEach((entry) => {
        if (entry.family === 'IPv4' && !entry.internal) {
            address = entry.address;
        }
    });
});
const LOCAL = address + ":443";

// First middleware
app.use("/", (req, _, next) => {
    if (req.secure) {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

        journalLog("[" + Date.now() + "] " + ip + " \x1b[34m" + req.method + "\x1b[0m https://" + LOCAL + req.url);
        next();
    }
});

// Use the "public" folder
app.use(express.static(join(__dirname, "public")));

// Route handler
app.get("/", (_, res) => {
    res.render("index.html");
})

io.on("connection", socket => {
    const ip = socket.handshake.address || socket.remoteAddress;

    io.emit("count", Object.keys(io.sockets.sockets).length );

    if (ip) {
        journalLog("[" + Date.now() + "] " + ip + " \x1b[32mCONNECT\x1b[0m " + LOCAL);

        socket.on("disconnect", () => {
            io.emit("count", Object.keys( io.sockets.sockets ).length);
            journalLog("[" + Date.now() + "] " + ip + " \x1b[35mDISCONNECT\x1b[0m " + LOCAL);
        });

        socket.on("message", msg => {
            const value = JSON.stringify(msg);
            appendFile(join( __dirname, "public/log"), value + "\n", err => {
                if (err) throw err;
            });

            io.emit("message", msg);
            journalLog("[" + Date.now() + "] " + ip + " \x1b[34mPOST\x1b[0m " + value.length + " Byte and " + LOCAL + " emitted to " + Object.keys(io.sockets.sockets).length + " sockets");
        });
    }
});

// Listening
server.listen(443, () => {
    journalLog("Listening on " + LOCAL);
});

// 404
app.use((req, res, _) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    journalLog("[" + Date.now() + "] " + ip + " \x1b[31m404\x1b[0m " + req.url);
    res.status(404).send( "404 Not Found" );
});

// 500
app.use((err, _, res) => {
    journalLog(err.stack);
    res.status(500).send("500 Internal Server Error");
});
