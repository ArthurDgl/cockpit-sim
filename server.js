// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Client has connected');

    socket.on('pilotAction', (data) => {
        console.log(`received : ${data.command} : ${data.value}`);
        
        // TODO : msfs bridge
    });

    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    let time = 8 * 3600; // 8 am in seconds
    let heading = randomBetween(0, 359);
    let adfHeading = randomBetween(0, 359);
    const tempSim = setInterval(() => {
        time += 0.1;
        heading += 1;
        adfHeading += 1;

        const data = {
            altitude: randomBetween(30000, 30500),
            airSpeed: randomBetween(240, 260),
            roll: randomBetween(-5, 5),
            pitch: randomBetween(-5, 5),
            verticalSpeed: randomBetween(-100, 100),
            engineSpeed: randomBetween(70, 95),
            fuel: randomBetween(0, 100),
            heading: heading,
            adfHeading: adfHeading,
            oil: randomBetween(0,100),
            turnRate: randomBetween(-10,10),
            time: time
        };

        socket.emit('planeData', data);
    }, 100);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        clearInterval(tempSim);
    });
});

server.listen(3000, () => {
    console.log('Server started at http://localhost:3000');
});
