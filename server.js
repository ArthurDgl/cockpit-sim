// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const simConnect = require('node-simconnect');
const SimConnectDataType = simConnect.SimConnectDataType;
const SimConnectConstants = simConnect.SimConnectConstants;
const SimConnectPeriod = simConnect.SimConnectPeriod;

app.use(express.static(__dirname));

let handlePilotAction = ((command, value, data) => {return;});

let globalSocket;
io.on('connection', (socket) => {
    globalSocket = socket;
    console.log('Client has connected');

    socket.on('pilotAction', (data) => {
        // console.log(`received : ${data.command} : ${data.value}`);
        
        handlePilotAction(data.command, data.value, data);
    });

    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    const tempSim = setInterval(() => {
        const data = {
            altitude: simData.altitude,
            airSpeed: simData.airSpeed,
            roll: simData.roll,
            pitch: simData.pitch,
            verticalSpeed: simData.verticalSpeed/1000,
            engineSpeed: simData.engineSpeed,
            fuel: simData.fuel,
            heading: simData.heading,
            adfHeading: simData.adfHeading,
            oil: simData.oil,
            turnRate: simData.turnRate*8,
            ball: simData.ball*39.6,
            time: simData.time,
            temperature: simData.temperature,
            cdi1: simData.cdi1,
            cdi2: simData.cdi2,
            navToFrom1: simData.navToFrom1,
            navToFrom2: simData.navToFrom2,
            suction: simData.suction,
            ammeter:-simData.ammeter
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

const EVENT_ID_PAUSE = 1;
const EVENT_VOR1_SET = 2;
const EVENT_AILERON_SET = 3;
const EVENT_ELEVATOR_SET = 4;

const REQUEST_1 = 0;
const DEFINITION_1 = 0;

let simData = {};

simConnect.open('Cockpit Simulator', simConnect.Protocol.KittyHawk)
.then(({recvOpen, handle}) => {
    console.log('Connected to', recvOpen.applicationName);

    handle.on('event', function (recvEvent) {
        switch (recvEvent.clientEventId) {
            case EVENT_ID_PAUSE:
                console.log(recvEvent.data === 1 ? 'Sim paused' : 'Sim unpaused');
                break;
        }
    });

    handle.on('exception', function (recvException) {
        console.log(recvException);
    });

    handle.on('quit', function () {
        console.log('Simulator quit');
    });

    handle.on('close', function () {
        console.log('Connection closed unexpectedly (simulator CTD?)');
    });

    handle.subscribeToSystemEvent(EVENT_ID_PAUSE, 'Pause');

    handle.addToDataDefinition(DEFINITION_1, 'Kohlsman setting hg', 'inHg', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'Indicated Altitude', 'feet', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'Plane Latitude', 'degrees', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'Plane Longitude', 'degrees', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'VERTICAL SPEED', 'Feet per minute', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'GENERAL ENG RPM:1', 'rpm', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'AIRSPEED INDICATED', 'knots', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'PLANE BANK DEGREES', 'degrees', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'PLANE PITCH DEGREES', 'degrees', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'FUEL TOTAL QUANTITY', 'percent', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'PLANE HEADING DEGREES MAGNETIC', 'degrees', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'ADF RADIAL:1', 'degrees', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'ENG OIL PRESSURE:1', 'psi', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'TURN INDICATOR RATE', 'degrees per second', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'TURN COORDINATOR BALL', 'position', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'LOCAL TIME', 'seconds', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'TOTAL AIR TEMPERATURE', 'celsius', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'NAV CDI:1', 'number', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'NAV CDI:2', 'number', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'NAV TOFROM:1', 'Enum', SimConnectDataType.INT32);
    handle.addToDataDefinition(DEFINITION_1, 'NAV TOFROM:2', 'Enum', SimConnectDataType.INT32);
    handle.addToDataDefinition(DEFINITION_1, 'SUCTION PRESSURE', 'Inches of Mercury', SimConnectDataType.FLOAT64);
    handle.addToDataDefinition(DEFINITION_1, 'ELECTRICAL BATTERY BUS AMPS', 'Amperes', SimConnectDataType.FLOAT64);


    handle.requestDataOnSimObject(REQUEST_1, DEFINITION_1, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SIM_FRAME);

    handle.on('simObjectData', recvSimObjectData => {
        switch (recvSimObjectData.requestID) {
            case REQUEST_1: {
                const receivedData = {
                    // Read order is important!
                    kohlsmann: recvSimObjectData.data.readFloat64(),
                    altitude: recvSimObjectData.data.readFloat64(),
                    latitude: recvSimObjectData.data.readFloat64(),
                    longitude: recvSimObjectData.data.readFloat64(),
                    verticalSpeed: recvSimObjectData.data.readFloat64(),
                    engineSpeed: recvSimObjectData.data.readFloat64(),
                    airSpeed: recvSimObjectData.data.readFloat64(),
                    roll: recvSimObjectData.data.readFloat64(),
                    pitch: -recvSimObjectData.data.readFloat64(),
                    fuel: recvSimObjectData.data.readFloat64(),
                    heading: recvSimObjectData.data.readFloat64(),
                    adfHeading: recvSimObjectData.data.readFloat64(),
                    oil: recvSimObjectData.data.readFloat64(),
                    turnRate: recvSimObjectData.data.readFloat64(),
                    ball: recvSimObjectData.data.readFloat64(),
                    time: recvSimObjectData.data.readFloat64(),
                    temperature: recvSimObjectData.data.readFloat64(),
                    cdi1: recvSimObjectData.data.readFloat64(),
                    cdi2: recvSimObjectData.data.readFloat64(),
                    navToFrom1: recvSimObjectData.data.readInt32(), // Int 32
                    navToFrom2: recvSimObjectData.data.readInt32(), // Int 32
                    suction: recvSimObjectData.data.readFloat64(),
                    ammeter: recvSimObjectData.data.readFloat64(),
                }
                simData = receivedData;
                break;
            }
        }
    });

    handle.mapClientEventToSimEvent(EVENT_VOR1_SET, 'VOR1_SET');
    handle.mapClientEventToSimEvent(EVENT_AILERON_SET, 'AILERON_SET');
    handle.mapClientEventToSimEvent(EVENT_ELEVATOR_SET, 'ELEVATOR_SET');

    handle.addClientEventToNotificationGroup(1, EVENT_VOR1_SET, false);
    handle.addClientEventToNotificationGroup(1, EVENT_AILERON_SET, false);
    handle.addClientEventToNotificationGroup(1, EVENT_ELEVATOR_SET, false);
    handle.setNotificationGroupPriority(1, 1);

    handlePilotAction = (command, value, data) => {
        if (command === 'OBS1') {
            handle.transmitClientEvent(0, EVENT_VOR1_SET, value, 1, 0);
        }
        else if (command === 'YOKE') {
            // console.log(value);
            const aileron = Math.max(Math.min(Math.floor(-value.roll / 2 * 16384), 16384), -16383) >>> 0;
            const elevator = Math.max(Math.min(Math.floor(value.pitch / 2 * 16384), 16384), -16383) >>> 0;
            handle.transmitClientEvent(0, EVENT_AILERON_SET, aileron, 1, 0);
            handle.transmitClientEvent(0, EVENT_ELEVATOR_SET, elevator, 1, 0);
        }
    }
})
.catch(function (error) {
    console.log('Connection failed:', error);
});

const port = new SerialPort({
  path: 'COM3',
  baudRate: 115200
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', (line) => {
    // console.log(line);
    data = JSON.parse(line);
    
    if (!data) return;

    if (data.action === 'ROT_TEST') {
        const angle = ((data.value % 360) + 360) % 360;

        // console.log(angle);

        handlePilotAction('OBS1', angle, {});
        globalSocket.emit('physicalAction', {action:'OBS1', value:angle});
    }
    else if (data.action === 'YOKE') {
        handlePilotAction('YOKE', data, {});
    }
});

port.on('open', () => {
  console.log('Serial connection opened');
});