// server.js

const USE_SIM = true;
const USE_ARDUINO = true;

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const fs = require('fs');
const path = require('path');

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
// const io = (server, { wsEngine: 'ws' });

const simConnect = require('node-simconnect');
const SimConnectDataType = simConnect.SimConnectDataType;
const SimConnectConstants = simConnect.SimConnectConstants;
const SimConnectPeriod = simConnect.SimConnectPeriod;

const configFile = require("./presets/default.json");

const hardwareConfig = require('./hardwareconfigs/default.json');
const rotaryEncoderValues = {};

app.use(express.static(__dirname));

let handlePilotAction = ((command, value, data) => {return;});


let emitOnSocket = (message, data) => {};
let emitOnIo = (message, data) => {};

let users = {};

io.on('connection', (socket) => {
    console.log(`Client has connected: ${socket.id}`);
    socket.join('users');

    const files = fs.readdirSync('./presets');
        socket.emit("files", files);
    
        socket.on('loadPreset', (name) => {
            const file = fs.existsSync(path.join(__dirname, 'presets', `${name}`)) ? `${name}` : 'default.json';
            socket.emit('loadConfig', require(`./presets/${file}`));
        });
    
    // socket.emit('loadConfig', configjson);

    socket.on('pilotAction', (data) => {
        handlePilotAction(data.command, data.value, data);
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

    emitOnSocket = (message, data) => {
        socket.emit(message, data);
    };

    emitOnIo = (message, data) => {
        // socket.broadcast.to('users').volatile.emit(message, data);
        // socket.volatile.emit(message, data);
        io.emit(message, data);
    };
    
    socket.on('disconnect', () => {
        console.log(`Client has disconnected: ${socket.id}`);
    });
});

const EVENT_ID_PAUSE = 0;

server.listen(3000, () => {
    console.log('Server started at http://localhost:3000');
});

const REQUEST_1 = 0;
const DEFINITION_1 = 0;

function preparePlaneData(simData) {
    const data = simData;
    data.verticalSpeed /= 1000;
    data.turnRate *= 8;
    data.ball *= 39.6;
    data.ammeter *= -1;
    
    return data;
}

const receivedCallbacks = [];
function executeOnNextReceive(callback) {
    receivedCallbacks.push(callback);
}

function executeReceivedCallbacks() {
    while (receivedCallbacks.length > 0) {
        const callback = receivedCallbacks.shift();
        callback();
    }
}

let lastSendTime = Date.now();
const minElapsedTime = 30;
function trySendingSimData(simData) {
    executeReceivedCallbacks();

    const now = Date.now();
    const elapsed = now - lastSendTime;
    // lastSendTime = now;

    if (elapsed < minElapsedTime) return;
    lastSendTime = now;

    const data = preparePlaneData(simData);
    emitOnIo('planeData', data);
}

let simData = {};

if (USE_SIM) {
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

        handle.addToDataDefinition(DEFINITION_1, 'Indicated Altitude', 'feet', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'Plane Latitude', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'Plane Longitude', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'VERTICAL SPEED', 'Feet per minute', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'GENERAL ENG RPM:1', 'rpm', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'AIRSPEED INDICATED', 'knots', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'PLANE BANK DEGREES', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'PLANE PITCH DEGREES', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'FUEL TOTAL QUANTITY WEIGHT', 'pounds', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'PLANE HEADING DEGREES MAGNETIC', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'ADF RADIAL:1', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'ENG OIL PRESSURE:1', 'psi', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'TURN INDICATOR RATE', 'degrees per second', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'TURN COORDINATOR BALL', 'position', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'LOCAL TIME', 'seconds', SimConnectDataType.INT32);
        handle.addToDataDefinition(DEFINITION_1, 'TOTAL AIR TEMPERATURE', 'celsius', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV CDI:1', 'number', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV CDI:2', 'number', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV TOFROM:1', 'Enum', SimConnectDataType.INT32);
        handle.addToDataDefinition(DEFINITION_1, 'NAV TOFROM:2', 'Enum', SimConnectDataType.INT32);
        handle.addToDataDefinition(DEFINITION_1, 'NAV OBS:1', 'degrees', SimConnectDataType.INT32);
        handle.addToDataDefinition(DEFINITION_1, 'NAV OBS:2', 'degrees', SimConnectDataType.INT32);
        handle.addToDataDefinition(DEFINITION_1, 'SUCTION PRESSURE', 'Inches of Mercury', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'ELECTRICAL BATTERY BUS AMPS', 'Amperes', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'ELEVATOR TRIM POSITION', 'degrees', SimConnectDataType.FLOAT64);


        handle.requestDataOnSimObject(REQUEST_1, DEFINITION_1, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SIM_FRAME);

        handle.on('simObjectData', recvSimObjectData => {
            switch (recvSimObjectData.requestID) {
                case REQUEST_1: {
                    const receivedData = {
                        // Read order is important!
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
                        time: recvSimObjectData.data.readInt32(), // Int 32
                        temperature: recvSimObjectData.data.readFloat64(),
                        cdi1: recvSimObjectData.data.readFloat64(),
                        cdi2: recvSimObjectData.data.readFloat64(),
                        navToFrom1: recvSimObjectData.data.readInt32(), // Int 32
                        navToFrom2: recvSimObjectData.data.readInt32(), // Int 32
                        navOBS1: recvSimObjectData.data.readInt32(), // Int 32
                        navOBS2: recvSimObjectData.data.readInt32(), // Int 32
                        suction: recvSimObjectData.data.readFloat64(),
                        ammeter: recvSimObjectData.data.readFloat64(),
                        elevTrim: recvSimObjectData.data.readFloat64(),
                    }
                    simData = receivedData;
                    trySendingSimData(receivedData);
                    break;
                }
            }
        });

        const clientEvents = {};
        const registeredClientEvents = new Set();
        let nextIndex = 1;

        function registerClientEvent(eventString) {
            if (!eventString || registeredClientEvents.has(eventString)) {
                return;
            }

            clientEvents[eventString] = nextIndex;
            registeredClientEvents.add(eventString);
            nextIndex++;
            handle.mapClientEventToSimEvent(clientEvents[eventString], eventString);
            handle.addClientEventToNotificationGroup(1, clientEvents[eventString], false);
            console.log(eventString + " " + clientEvents[eventString]);
        }

        function sendEventData(eventString, value) {
            handle.transmitClientEvent(0, clientEvents[eventString], value, 1, 0);
        }

        registerClientEvent('AILERON_SET'); // clientEvents['AILERON_SET']
        registerClientEvent('ELEVATOR_SET');
        registerClientEvent('AXIS_RUDDER_SET');

        // registerClientEvent('VOR1_SET');

        // registerClientEvent('CABIN_LIGHTS_SET');
        // registerClientEvent('PARKING_BRAKE_SET');
        // registerClientEvent('THROTTLE_SET');
        // registerClientEvent('PITOT_HEAT_SET');
        // registerClientEvent('NAV_LIGHTS_SET');
        // registerClientEvent('STROBES_SET');
        // registerClientEvent('BEACON_LIGHTS_SET');
        // registerClientEvent('TAXI_LIGHTS_SET');
        // registerClientEvent('LANDING_LIGHTS_SET');

        if (USE_ARDUINO) {
            hardwareConfig.YokePins.forEach(pin => {
                if (pin.activeOn == -1) return;

                registerClientEvent(pin.eventString);
            });
        }

        handle.setNotificationGroupPriority(1, 1);

        handlePilotAction = (command, value, data) => {
            if (command === 'OBS1') {
                handle.transmitClientEvent(0, EVENT_VOR1_SET, value, 1, 0);
            }
            else if (command === 'YOKE') {
                const aileron = Math.max(Math.min(Math.floor(-value.roll / 2 * 16384), 16384), -16383) >>> 0;
                const elevator = Math.max(Math.min(Math.floor(value.pitch / 2 * 16384), 16384), -16383) >>> 0;
                handle.transmitClientEvent(0, clientEvents['AILERON_SET'], aileron, 1, 0);
                handle.transmitClientEvent(0, clientEvents['ELEVATOR_SET'], elevator, 1, 0);
            }
            else if (command === 'PEDALS'){
                const rudder = Math.max(Math.min(Math.floor((value.pdl_left - value.pdl_right) * 16384), 16384), -16383) >>> 0;
                handle.transmitClientEvent(0, clientEvents['AXIS_RUDDER_SET'], rudder, 1, 0);
            }
            else if (command === 'YokePinValue') {
                const pinConfig = hardwareConfig.YokePins[value.pin];
                if (pinConfig.activeOn != value.value) return;

                const multplier = pinConfig.multiplier ?? 1;
                
                for (let i = 0; i < multplier; i++) {
                    sendEventData(pinConfig.eventString, value.value);
                }

                if (pinConfig.eventString === 'ELEV_TRIM_UP' || pinConfig.eventString === 'ELEV_TRIM_DN') {
                    executeOnNextReceive(() => {
                        const currentTrim = simData.elevTrim || 0;
                        const absTrim = Math.abs(currentTrim * 100);
                        const hexTrim = parseInt("0x" + absTrim);
                        writeIntegerAndDisappear(hexTrim);
                    });
                }
            }
            else if (command === 'Test pr le moment'){
                //const nom du truc = Math.max(Math.min(Math.floor(value.nom * 16384), 16384), 0) >>> 0;
                //handle.transmitClientEvent(0, EVENT_THROTTLE_SET, nom du truc, 1,0)
            }
        }
    })
    .catch(function (error) {
        console.log('Connection failed:', error);
    });
}

function limit(x, n) {
    return ((x % n) + n) % n;
}

let currentTimeout = null;
function writeIntegerAndDisappear(value, delay = 3000) {
    writeIntegerToSerialPort(value);

    currentTimeout = setTimeout(() => {
        writeIntegerToSerialPort(0);
    }, delay);
}

function writeIntegerToSerialPort(value) {
    return;
}

if(USE_ARDUINO){
    const port = new SerialPort({
    path: 'COM3',
    baudRate: 115200
    });

    writeIntegerToSerialPort = (value) => {
        clearTimeout(currentTimeout);
        if (!port.isOpen) {
            console.warn('[SERIAL] Port is not open, skipping write');
            return false;
        }

        const integerValue = Number.parseInt(value, 10);

        if (!Number.isInteger(integerValue)) {
            throw new TypeError(`Expected an integer value, received: ${value}`);
        }

        port.write(`${integerValue}\n`, (error) => {
            if (error) {
                console.error('[SERIAL] Failed to write integer:', error);
            }
        });

        return true;
    }

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    const inputOffsets = {};

    parser.on('data', (line) => {
        data = JSON.parse(line);
        
        if (!data) return;

        if (data.action === 'PCFValue') {
            handlePCFValueMessage(data.address, data.value);
        }
        else if (data.action === 'YOKE') {
            handlePilotAction('YOKE', data, {});
        }
        else if (data.action === 'PEDALS') {
            handlePilotAction('PEDALS', data, {});
        }
        else if (data.action === 'YokePinValue') {
            handlePilotAction('YokePinValue', data, {});
        }
        else if (data.action === 'message') {
            console.log("[ARDUINO] : " + data.message);
        }
    });

    port.on('open', () => {
    console.log('Serial connection opened');
    });

    hardwareConfig.PCFs.forEach(pcf => {
        pcf.pins.forEach(pin => {
            switch(pin.type) {
                case "ROT":
                    rotaryEncoderValues[pin.key] = {};
                    rotaryEncoderValues[pin.key][pin.signal] = 1;
                    rotaryEncoderValues[pin.key].rawCount = 0;
                    rotaryEncoderValues[pin.key].trueCount = 0;
                    rotaryEncoderValues[pin.key].moddedCount = 0;
                    break;
                case "empty":
                    break;
                default:
                    console.log('[WARNING] : Unrecognized configuration');
                    break;
            }
        });
    });

    function handlePCFValueMessage(address, value) {
        const config = hardwareConfig.PCFs.find(config => config.address == address);
        let binString = ('' + value).split('').reverse().join('');
        const rotaryEncodersToUpdate = [];
        config.pins.forEach((pin, i) => {
            switch(pin.type) {
                case "ROT":
                    let oldA;
                    if (pin.signal === 'A') {
                        oldA = rotaryEncoderValues[pin.key].A;
                    }
                    const newValue = parseInt(binString[i]);
                    rotaryEncoderValues[pin.key][pin.signal] = newValue;
                    if (pin.signal === 'A') {
                        const changeA = Math.abs(oldA - newValue);
                        if (changeA == 1) {
                            rotaryEncodersToUpdate.push(pin.key);
                        } 
                    }
                    break;
                case "empty":
                default:
                    break;
            }
        });
        rotaryEncodersToUpdate.forEach(key => {
            const re = rotaryEncoderValues[key];
            if (re.A == re.B) re.rawCount--;
            else re.rawCount++;
            const mult = re.C == 1 ? 1 : 10;
            const lastPos = re.trueCount;
            re.trueCount = Math.floor((re.rawCount + 1) / 2);
            if (lastPos != re.trueCount) {
                re.moddedCount += (re.trueCount - lastPos) * mult;
            }
        });
    }
    
}