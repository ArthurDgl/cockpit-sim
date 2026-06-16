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
const muxValues = {};
const eventValues = {};

const rotaryEncoderValuesInit = {
    'COM_STBY_RADIO_SET_HZ_1': {source: 'comStandbyFreq1', multiplier: 1, mod: 1000, roundAt: 1},
    'COM_STBY_RADIO_SET_HZ_1000': {source: 'comStandbyFreq1', multiplier: 1, mod: 1000000, roundAt: 1000},
    'COM2_STBY_RADIO_SET_HZ_1': {source: 'comStandbyFreq2', multiplier: 1, mod: 1000, roundAt: 1},
    'COM2_STBY_RADIO_SET_HZ_1000': {source: 'comStandbyFreq2', multiplier: 1, mod: 1000000, roundAt: 1000}
};

const EVENT_ID_PAUSE = 0;
const REQUEST_1 = 0;
const DEFINITION_1 = 0;

app.use(express.static(__dirname));

const logger = require("./logger");

async function shutdown(signal) {
  logger.info(`Received ${signal}`);

  await logger.close();

  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

function handlePilotAction(command, value, data) {
    logger.warn('Initialization not complete : handlePilotAction');
}

function emitOnSocket(message, data) {
    logger.warn('Initialization not complete : emitOnSocket');
}

function emitOnIo(message, data) {
    // logger.warn('Initialization not complete : emitOnIo');
}

function writeIntegerToSerialPort(value, port) {
    logger.warn('Initialization not complete : writeIntegerToSerialPort');
}

function writeStringToSerialPort(value, port) {
    logger.warn('Initialization not complete : writeStringToSerialPort');
}

function processRotaryEncoderValue(key, value) {
    logger.warn('Initialization not complete : processRotaryEncoderValue');
}

io.on('connection', (socket) => {
    logger.info(`Client has connected: ${socket.id}`);
    socket.join('users');

    const files = fs.readdirSync('./presets');
    socket.emit("files", files);

    socket.on('loadPreset', (name) => {
        const file = fs.existsSync(path.join(__dirname, 'presets', `${name}`)) ? `${name}` : 'default.json';
        socket.emit('loadConfig', require(`./presets/${file}`));
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

            logger.info(`New preset created : presets/${data.name}.json`);

        } catch (error) {
            logger.error('Error happened when trying to create the JSON file:' + error);
        }
    });

    emitOnSocket = (message, data) => {
        socket.emit(message, data);
    };

    emitOnIo = (message, data) => {
        io.emit(message, data);
    };
    
    socket.on('disconnect', () => {
        logger.info(`Client has disconnected: ${socket.id}`);
    });
});

server.listen(3000, () => {
    logger.info('Server started at http://localhost:3000');
});

function preparePlaneData(simData) {
    const data = JSON.parse(JSON.stringify(simData));
    data.verticalSpeed /= 1000;
    data.turnRate *= 8;
    data.ball *= 39.6;
    data.ammeter *= -1;
    data.comActiveFreq1 = Math.round(data.comActiveFreq1 / 1000);
    data.comStandbyFreq1 = Math.round(data.comStandbyFreq1 / 1000);
    data.navActiveFreq1 = Math.round(data.navActiveFreq1 / 1000);
    data.navStandbyFreq1 = Math.round(data.navStandbyFreq1 / 1000);
    data.comActiveFreq2 = Math.round(data.comActiveFreq2 / 1000);
    data.comStandbyFreq2 = Math.round(data.comStandbyFreq2 / 1000);
    data.navActiveFreq2 = Math.round(data.navActiveFreq2 / 1000);
    data.navStandbyFreq2 = Math.round(data.navStandbyFreq2 / 1000);

    return data;
}

const pendingCallbacks = [];
function executeOnNextReceive(callback) {
    pendingCallbacks.push(callback);
}

function executeReceivedCallbacks() {
    while (pendingCallbacks.length > 0) {
        const callback = pendingCallbacks.shift();
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

    writeRadioFrequencies(data, 'COM4');
    scheduleRadioSync('COM4');
}

let simulationData = {};

if (USE_SIM) {
    logger.info('Connecting to Flight Simulator...')
    simConnect.open('Cockpit Simulator', simConnect.Protocol.KittyHawk)
    .then(({recvOpen, handle}) => {
        logger.info('Connected to', recvOpen.applicationName);

        handle.on('event', function (recvEvent) {
            switch (recvEvent.clientEventId) {
                case EVENT_ID_PAUSE:
                    logger.info(recvEvent.data === 1 ? 'Sim paused' : 'Sim unpaused');
                    break;
            }
        });

        handle.on('exception', function (recvException) {
            logger.error(recvException);
        });

        handle.on('quit', function () {
            logger.info('Simulator quit');
        });

        handle.on('close', function () {
            logger.warn('Connection closed unexpectedly (simulator CTD?)');
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

        //7 segments
        handle.addToDataDefinition(DEFINITION_1, 'ELEVATOR TRIM POSITION', 'degrees', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'COM ACTIVE FREQUENCY:1', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'COM STANDBY FREQUENCY:1', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV ACTIVE FREQUENCY:1', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV STANDBY FREQUENCY:1', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'COM ACTIVE FREQUENCY:2', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'COM STANDBY FREQUENCY:2', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV ACTIVE FREQUENCY:2', 'Hertz', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_1, 'NAV STANDBY FREQUENCY:2', 'Hertz', SimConnectDataType.FLOAT64);


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
                        comActiveFreq1: recvSimObjectData.data.readFloat64(),
                        comStandbyFreq1: recvSimObjectData.data.readFloat64(),
                        navActiveFreq1: recvSimObjectData.data.readFloat64(),
                        navStandbyFreq1: recvSimObjectData.data.readFloat64(),
                        comActiveFreq2: recvSimObjectData.data.readFloat64(),
                        comStandbyFreq2: recvSimObjectData.data.readFloat64(),
                        navActiveFreq2: recvSimObjectData.data.readFloat64(),
                        navStandbyFreq2: recvSimObjectData.data.readFloat64()
                    }
                    simulationData = receivedData;
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

            logger.spam('Registered event : ' + eventString + ' with index ' + clientEvents[eventString]);
        }

        function sendEventData(eventString, value) {
            handle.transmitClientEvent(0, clientEvents[eventString], value, 1, 0);
            if (eventString.endsWith('RADIO_SWAP')) {
                executeOnNextReceive(() => {
                    synchronizeRotaryEncoderValues();
                });
            }
        }

        processRotaryEncoderValue = (pin, value) => {
            if (pin.eventString) {
                const eventValue = eventValues[pin.eventString];
                const multiplier = pin.eventMultiplier ?? 1;
                sendEventData(pin.eventString, eventValue * multiplier);
            }
        }

        
        registerClientEvent('AILERON_SET'); // clientEvents['AILERON_SET']
        registerClientEvent('ELEVATOR_SET');
        registerClientEvent('AXIS_RUDDER_SET');

        // registerClientEvent('COM1_RADIO_SWAP');
        // registerClientEvent('COM2_RADIO_SWAP');
        // registerClientEvent('NAV1_RADIO_SWAP');
        // registerClientEvent('NAV2_RADIO_SWAP');
        // registerClientEvent('COM_STBY_RADIO_SET_HZ');
        // registerClientEvent('NAV1_STBY_SET_HZ');

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
                if (!pin.eventString) return;

                registerClientEvent(pin.eventString);
            });

            hardwareConfig.MUXs.forEach(mux => {
                mux.pins.forEach(pin => {
                    if (!pin.eventString) return;

                    registerClientEvent(pin.eventString);
                })
            });

            synchronizeRotaryEncoderValues();
        }

        function synchronizeRotaryEncoderValues() {
            // logger.info('Synchronizing rotary encoder values...');
            hardwareConfig.PinExtenders.forEach(extender => {
                extender.pins.forEach(pin => {
                    if (!pin.eventString) return;

                    registerClientEvent(pin.eventString);
                    if (rotaryEncoderValuesInit[pin.key]) {
                        executeOnNextReceive(() => executeOnNextReceive(() => {
                            const { source, multiplier, mod, roundAt } = rotaryEncoderValuesInit[pin.key];
                            const oldValue = rotaryEncoderValues[pin.key].moddedCount;
                            rotaryEncoderValues[pin.key].moddedCount = Math.round(preparePlaneData(simulationData)[source] * (multiplier ?? 1) / (roundAt ?? 1)) * (roundAt ?? 1);
                            rotaryEncoderValues[pin.key].moddedCount = mod ? rotaryEncoderValues[pin.key].moddedCount % mod : rotaryEncoderValues[pin.key].moddedCount;
                            eventValues[pin.eventString] += rotaryEncoderValues[pin.key].moddedCount - oldValue;
                        }));
                    }
                });
            });
        }

        handle.setNotificationGroupPriority(1, 1);

        function muxValueChange(muxId, pinId, newValue, oldValue) {
            const pinConfig = hardwareConfig.MUXs.find(mux => mux.id == muxId).pins[pinId];
            if (pinConfig.type === 'empty') return;

            const [min, max] = [pinConfig.min, pinConfig.max];
            const normValue = (newValue - min) / (max - min);
            const digitalValue = normValue > 0.5 ? 1 : 0;

            if (pinConfig.type === 'digital' && pinConfig.eventString) {
                if (pinConfig.activeOn !== digitalValue) return;

                if (typeof oldValue !== 'undefined') {
                    const oldDigitalValue = ((oldValue - min) / (max - min)) > 0.5 ? 1 : 0;
                    if (oldDigitalValue === digitalValue) return;
                }

                const multiplier = pinConfig.multiplier ?? 1;
                
                for (let i = 0; i < multiplier; i++) {
                    sendEventData(pinConfig.eventString, digitalValue);
                }
            }
        }

        handlePilotAction = (command, data) => {
            if (command === 'YOKE') {
                const aileron = Math.max(Math.min(Math.floor(-data.roll / 2 * 16384), 16384), -16383) >>> 0;
                const elevator = Math.max(Math.min(Math.floor(data.pitch / 2 * 16384), 16384), -16383) >>> 0;
                // handle.transmitClientEvent(0, clientEvents['AILERON_SET'], aileron, 1, 0);
                // handle.transmitClientEvent(0, clientEvents['ELEVATOR_SET'], elevator, 1, 0);
                sendEventData('AILERON_SET', aileron);
                sendEventData('ELEVATOR_SET', elevator);
            }
            else if (command === 'PEDALS'){
                const rudder = Math.max(Math.min(Math.floor((data.pdl_left - data.pdl_right) * 16384), 16384), -16383) >>> 0;
                // handle.transmitClientEvent(0, clientEvents['AXIS_RUDDER_SET'], rudder, 1, 0);
                sendEventData('AXIS_RUDDER_SET', rudder);
            }
            else if (command === 'YokePinValue') {
                const pinConfig = hardwareConfig.YokePins[data.pin];
                if (pinConfig.activeOn != data.value) return;

                const multiplier = pinConfig.multiplier ?? 1;
                
                for (let i = 0; i < multiplier; i++) {
                    sendEventData(pinConfig.eventString, data.value);
                }

                if (pinConfig.eventString === 'ELEV_TRIM_UP' || pinConfig.eventString === 'ELEV_TRIM_DN') {
                    executeOnNextReceive(() => {
                        const currentTrim = simulationData.elevTrim || 0;
                        const absTrim = Math.abs(currentTrim * 100);
                        const hexTrim = parseInt("0x" + absTrim) + parseInt("0x0D000000");
                        writeIntegerAndDisappear(hexTrim);
                    });
                }
            }
            else if (command === 'MuxPinValue') {
                const pinValues = data.values;
                const muxId = data.id;

                const previousValues = muxValues[muxId];

                pinValues.forEach((value, i) => {
                    if (value != previousValues[i]) {
                        const oldValue = previousValues[i];
                        previousValues[i] = value;
                        muxValueChange(muxId, i, value, oldValue);
                    }
                });
            }
            else {
                logger.warn('Unrecognized pilot action : ' + command);
            }
        }
    })
    .catch(function (error) {
        logger.error('Connection failed: ' + error);
    });
}

const RADIO_WRITE_INTERVAL_MS = 25;
const RADIO_STARTUP_SYNC_DELAY_MS = 1500;
const writeQueue = [];
const queuedRadioFrequencyValues = new Map();
const lastWrittenRadioFrequencies = new Map();
let radioSyncTimer = null;
let flushingInterval = null;


function hasRadioFrequencySnapshot(data) {
    return data
        && Number.isFinite(Number(data.comActiveFreq1))
        && Number.isFinite(Number(data.comStandbyFreq1))
        && Number.isFinite(Number(data.navActiveFreq1))
        && Number.isFinite(Number(data.navStandbyFreq1))
        && Number.isFinite(Number(data.comActiveFreq2))
        && Number.isFinite(Number(data.comStandbyFreq2))
        && Number.isFinite(Number(data.navActiveFreq2))
        && Number.isFinite(Number(data.navStandbyFreq2));
}

function writeRadioFrequencies(data, portName = 'COM4') {
    enqueueRadioFrequencyIfChanged(0, 0, data.comActiveFreq1, portName);
    enqueueRadioFrequencyIfChanged(0, 1, data.comStandbyFreq1, portName);
    enqueueRadioFrequencyIfChanged(1, 0, data.comActiveFreq2, portName);
    enqueueRadioFrequencyIfChanged(1, 1, data.comStandbyFreq2, portName);
    enqueueRadioFrequencyIfChanged(2, 0, data.navActiveFreq1, portName);
    enqueueRadioFrequencyIfChanged(2, 1, data.navStandbyFreq1, portName);
    enqueueRadioFrequencyIfChanged(3, 0, data.navActiveFreq2, portName);
    enqueueRadioFrequencyIfChanged(3, 1, data.navStandbyFreq2, portName);
}

function enqueueAllRadioFrequencies(data, portName = 'COM4') {
    // logger.info(`Enqueuing all radio frequencies for sync on ${portName}`);
    enqueueRadioFrequencyIfChanged(0, 0, data.comActiveFreq1, portName, true);
    enqueueRadioFrequencyIfChanged(0, 1, data.comStandbyFreq1, portName, true);
    enqueueRadioFrequencyIfChanged(1, 0, data.comActiveFreq2, portName, true);
    enqueueRadioFrequencyIfChanged(1, 1, data.comStandbyFreq2, portName, true);
    enqueueRadioFrequencyIfChanged(2, 0, data.navActiveFreq1, portName, true);
    enqueueRadioFrequencyIfChanged(2, 1, data.navStandbyFreq1, portName, true);
    enqueueRadioFrequencyIfChanged(3, 0, data.navActiveFreq2, portName, true);
    enqueueRadioFrequencyIfChanged(3, 1, data.navStandbyFreq2, portName, true);
}

function scheduleRadioSync(portName = 'COM4') {
    if (radioSyncTimer) {
        return;
    }

    radioSyncTimer = setTimeout(() => {
        radioSyncTimer = null;

        if (!hasRadioFrequencySnapshot(simulationData)) {
            scheduleRadioSync(portName);
            return;
        }

        enqueueAllRadioFrequencies(preparePlaneData(simulationData), portName);
        // logger.spam(`Radio startup sync queued on ${portName}`);
    }, RADIO_STARTUP_SYNC_DELAY_MS);
}

function enqueueRadioFrequencyIfChanged(line, display, value, portName = 'COM4', force = false) {
    const key = `${portName}:${line}:${display}`;
    const numericValue = Number(value);
    const pendingValue = queuedRadioFrequencyValues.get(key);

    if (!force && (lastWrittenRadioFrequencies.get(key) === numericValue || pendingValue === numericValue)) {
        // logger.spam(`Radio frequency for ${key} is already queued or written, skipping enqueue.`);
        return false;
    }

    queuedRadioFrequencyValues.set(key, numericValue);

    const existingIndex = writeQueue.findIndex(item => item.key === key);

    if (existingIndex >= 0) {
        writeQueue[existingIndex].value = numericValue;
    } else {
        writeQueue.push({ key, line, display, value: numericValue, portName });
    }

    startFlushingQueue();
    return true;
}

function startFlushingQueue() {
    if (writeQueue.length === 0 || flushingInterval) {
        return;
    }

    flushingInterval = setInterval(() => {
        if (writeQueue.length === 0) {
            clearInterval(flushingInterval);
            flushingInterval = null;
            return;
        }
        const { key, line, display, value, portName } = writeQueue.shift();
        queuedRadioFrequencyValues.delete(key);
        writeRadioFrequency(line, display, value, portName);
        lastWrittenRadioFrequencies.set(key, value);
    }, RADIO_WRITE_INTERVAL_MS);
}

function writeRadioFrequency(line, display, value, portName = 'COM4') {
    const control = line + 16*display;
    const valueString = '' + value;
    const hexString = '0x' + valueString.padStart(7, 'F') + 'F';
    const encodedValue = Number.parseInt(hexString);

    if (!writeStringToSerialPort(`${control},${encodedValue}`, portName)) {
        return false;
    }

    return true;
}

let currentTimeout = null;
function writeIntegerAndDisappear(value, delay = 3000, portName = 'COM3') {
    writeIntegerToSerialPort(value, portName);

    currentTimeout = setTimeout(() => {
        writeIntegerToSerialPort(0, portName);
    }, delay);
}

if(USE_ARDUINO){
    logger.info('Connecting to Arduino boards...');

    const serialPortNames = ['COM3', 'COM4', 'COM5'];
    const serialPortState = new Map();

    function markSerialPortUnavailable(portName, error) {
        const state = serialPortState.get(portName);
        if (!state || state.unavailable) return;

        state.unavailable = true;
        if (error) {
            logger.error(`Serial port ${portName} failed: ${error}`);
        } else {
            logger.error(`Serial port ${portName} is unavailable`);
        }
    }

    function createSerialPort(portPath) {
        try {
            const port = new SerialPort({
                path: portPath,
                baudRate: 115200
            });

            serialPortState.set(portPath, { port, unavailable: false });

            port.on('error', (error) => {
                markSerialPortUnavailable(portPath, error);
            });

            port.on('close', () => {
                markSerialPortUnavailable(portPath);
                logger.warn(`Serial port ${portPath} closed`);
            });

            port.on('open', () => {
                const state = serialPortState.get(portPath);
                if (state) {
                    state.unavailable = false;
                }
                logger.info(`Serial connection opened (${portPath})`);
            });

            return port;
        } catch (error) {
            markSerialPortUnavailable(portPath, error);
            return null;
        }
    }

    const port1 = createSerialPort('COM3');
    const port2 = createSerialPort('COM4');
    const port3 = createSerialPort('COM5');

    function getSerialPort(portName) {
        const port = serialPortNames.includes(portName)
            ? serialPortState.get(portName)?.port
            : null;

        if (portName && port) {
            const state = serialPortState.get(portName);
            if (!state || state.unavailable || !port.isOpen) {
                return null;
            }
            return port;
        }

        for (const name of serialPortNames) {
            const state = serialPortState.get(name);
            if (state && !state.unavailable && state.port && state.port.isOpen) {
                return state.port;
            }
        }

        return null;
    }

    writeIntegerToSerialPort = (value, portName = 'COM3') => {
        clearTimeout(currentTimeout);

        const port = getSerialPort(portName);

        if (!port) {
            return false;
        }

        const integerValue = Number.parseInt(value);
        logger.spam(`Writing integer ${integerValue} to serial port ${portName}`);

        if (!Number.isInteger(integerValue)) {
            throw new TypeError(`Expected an integer value, received: ${value}`);
        }

        port.write(`${integerValue}\n`, (error) => {
            if (error) {
                logger.error('Serial port failed to write integer:' + error);
            }
        });

        return true;
    }

    writeStringToSerialPort = (value, portName = 'COM3') => {
        clearTimeout(currentTimeout);

        const port = getSerialPort(portName);

        if (!port) {
            return false;
        }

        const stringValue = `${value}`;
        // logger.spam(`Writing string ${stringValue} to serial port ${portName}`);

        port.write(`${stringValue}\n`, (error) => {
            if (error) {
                logger.error('Serial port failed to write string:' + error);
            }
        });

        return true;
    }

    const parser1 = port1 ? port1.pipe(new ReadlineParser({ delimiter: '\n' })) : null;
    const parser2 = port2 ? port2.pipe(new ReadlineParser({ delimiter: '\n' })) : null;
    const parser3 = port3 ? port3.pipe(new ReadlineParser({ delimiter: '\n' })) : null;

    function processLine(line) {
        logger.spam(`Received serial line: ${line}`);
        let data;

        try {
            data = JSON.parse(line);
        } catch (error) {
            logger.warn(`Ignoring malformed serial line: ${line}`);
            return;
        }

        if (!data) return;

        if (data.action === 'PinExtenderValue') {
            handlePinExtenderValueMessage(data.address, data.value);
        }
        else if (data.action === 'message') {
            logger.arduino(data.message);
        }
        else{
            handlePilotAction(data.action, data);
        }
    }

    if (parser1) {
        parser1.on('data', processLine);
    }

    if (parser2) {
        parser2.on('data', processLine);
    }

    if (parser3) {
        parser3.on('data', processLine);
    }

    hardwareConfig.PinExtenders.forEach(extender => {
        extender.pins.forEach(pin => {
            switch(pin.type) {
                case "ROT":
                    if (rotaryEncoderValues[pin.key]) break;
                    rotaryEncoderValues[pin.key] = {};
                    rotaryEncoderValues[pin.key][pin.signal] = 1;
                    rotaryEncoderValues[pin.key].rawCount = 0;
                    rotaryEncoderValues[pin.key].trueCount = 0;
                    rotaryEncoderValues[pin.key].moddedCount = 0;
                    if (pin.eventString) eventValues[pin.eventString] = 0;
                    break;
                case "empty":
                    break;
                default:
                    logger.warn('Unrecognized configuration');
                    break;
            }
        });
    });

    hardwareConfig.MUXs.forEach(mux => {
        muxValues[mux.id] = [];
        mux.pins.forEach(pin => {
            muxValues[mux.id].push(0);
        })
    });

    function handlePinExtenderValueMessage(address, value) {
        const config = hardwareConfig.PinExtenders.find(config => config.address == address);
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
                            rotaryEncodersToUpdate.push(pin);
                        } 
                    }
                    break;
                case "empty":
                default:
                    break;
            }
        });
        rotaryEncodersToUpdate.forEach((pin) => {
            const re = rotaryEncoderValues[pin.key];
            const lastPos = re.trueCount;
            if (re.A == re.B) re.rawCount--;
            else re.rawCount++;
            const multiplier = (re.C == 1 ? 1 : 10) * (pin.mult ?? 1);
            re.trueCount = Math.floor((re.rawCount + 1) / 2);
            if (lastPos != re.trueCount) {
                const oldCount = re.moddedCount;
                re.moddedCount += (re.trueCount - lastPos) * multiplier;
                if (pin.mod) re.moddedCount = (re.moddedCount + pin.mod) % pin.mod;
                if (pin.eventString) {
                    eventValues[pin.eventString] += (re.moddedCount - oldCount);
                }
                processRotaryEncoderValue(pin, re.moddedCount);
                // logger.info(re.moddedCount);
            }
        });
    }
    
}