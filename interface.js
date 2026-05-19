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
            altitude: randomBetween(0,400),
            airSpeed: randomBetween(0,400),
            roll: randomBetween(0,400),
            pitch:          randomBetween(0,400),
            verticalSpeed:  randomBetween(0,400),
            engineSpeed:    randomBetween(0,400),
            fuel:           randomBetween(0,400),
            heading:        randomBetween(0,400),
            adfHeading:     randomBetween(0,400),
            oil:            randomBetween(0,400),
            turnRate:       randomBetween(0,400),
            ball:           randomBetween(0,400),
            temperature:    randomBetween(-50,70),
            time:           randomBetween(0,400)
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

