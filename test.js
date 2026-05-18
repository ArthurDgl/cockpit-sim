const simConnect = require('node-simconnect');
const SimConnectDataType = simConnect.SimConnectDataType;
const SimConnectConstants = simConnect.SimConnectConstants;
const SimConnectPeriod = simConnect.SimConnectPeriod;

const EVENT_ID_PAUSE = 1;
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
    handle.addToDataDefinition(DEFINITION_1, 'VERTICAL SPEED', 'Feet per second', SimConnectDataType.INT32);

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
                    verticalSpeed: recvSimObjectData.data.readInt32(),
                }
                simData = receivedData;
                break;
            }
        }
    });
  })
  .catch(function (error) {
      console.log('Connection failed:', error);
  });

setInterval(() => {
    console.log(simData);
}, 1000);