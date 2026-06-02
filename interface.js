// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

//here you can choose the preset you want to load by replacing ./presets/... with the name of the preset
const configFile = require("./presets/default.json");

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Client has connected');

    socket.emit('loadConfig', configFile);

    socket.on('pilotAction', (data) => {
        console.log(`received : ${data.command} : ${data.value}`);
        
        // TODO : msfs bridge
    });

    socket.on('createNewPreset', (data) => {
        try {
            // path to the presets folder
            const folderPath = path.join(__dirname, 'presets');
            const filePath = path.join(folderPath, `${data.name}.json`);

            // checking if the file doesn't exist, if he doesn't we create it 
            if (!fs.existsSync(folderPath)){
                fs.mkdirSync(folderPath, { recursive: true });
            }
            // writting everything into the json file
            fs.writeFileSync(filePath, JSON.stringify({ components: data.components }, null, 4), 'utf-8');

            console.log(`New preset created : presets/${data.name}.json`);

        } catch (error) {
            console.error(" Error happened when trying to create the JSON file:", error);
        }
    })


    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    let time = 8 * 3600; // 8 am in seconds
    let heading = randomBetween(0, 359);
    let adfHeading = randomBetween(0, 359);
    const tempSim = setInterval(() => {
        time += 0.1;
        heading += 1;
        adfHeading += 1;

        const data = {
            altitude:       randomBetween(0,400),
            airSpeed:       randomBetween(0,300),
            roll:           randomBetween(0,400),
            pitch:          randomBetween(0,400),
            verticalSpeed:  randomBetween(0,400),
            engineSpeed:    randomBetween(0,3500),
            fuel:           randomBetween(0,100),
            heading:        randomBetween(0,400),
            adfHeading:     randomBetween(0,400),
            oil:            randomBetween(0,100),
            turnRate:       randomBetween(0,400),
            ball:           randomBetween(0,400),
            temperature:    randomBetween(-50,70),
            time:           randomBetween(0,400),
            suction:        randomBetween(0,10),
            ammeter:        randomBetween(-60,60)
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

