const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const { generateMessage } = require("./utils/message.js");

// Package for filtering bad - words in messages
const Filter = require("bad-words");

const { addUser, getUser, removeUser, getUsersInRoom } = require("./utils/users.js");

const port = process.env.PORT || 3000
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

io.on('connection', (socket) => {
    console.log("New client Connected");

    // io.emit - everyone, socket.emit - current socket, socket.broadcast.emit - everyone except current socket
    // io.to.emit - everyone on the room, socket.broadcast.to.emit - everyone except current on room

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('message', generateMessage("Welcome!"))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))

        io.to(user.room).emit('roomData', user.room, getUsersInRoom(user.room));
        callback()
    })

    // callback is used for acknowledgement, if the data is received by receiver or not.
    socket.on('sentMessage', (message, callback) => {
        const filter = new Filter();
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback("Profanity is not Allowed!");
        }
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    });

    socket.on('send-location', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    })

    // If a connected socket disconnect, then this is triggered.
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData', user.room, getUsersInRoom(user.room))
        }
    })
})

server.listen(port, () => {
    console.log("Server started on port 3000.");
})