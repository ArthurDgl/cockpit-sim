const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Change this to your Arduino port
const port = new SerialPort({
  path: 'COM3',
  baudRate: 115200
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', (line) => {
    console.log(line);
    data = JSON.parse(line);
    console.log(data.value);
});

port.on('open', () => {
  console.log('Serial connection opened');
});