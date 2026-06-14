const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "logs");
fs.mkdirSync(logDir, { recursive: true });

const filename =
  new Date()
    .toISOString()
    .replace(/[:.]/g, "-") + ".log";

const filePath = path.join(logDir, filename);

const stream = fs.createWriteStream(filePath, {
  flags: "a"
});

function write(level, message) {
  const timestamp = new Date().toISOString();
  const fileLine = `[${timestamp}] ${level} ${message}\n`;
  const stdoutLine = `${message}\n`;

  process.stdout.write(stdoutLine);
  stream.write(fileLine);
}

module.exports = {
  info(msg) {
    write("INFO ", msg);
  },

  warn(msg) {
    write("WARN ", msg);
  },

  error(msg) {
    write("ERROR", msg);
  },

  spam(msg) {
    write("SPAM", msg);
  },

  arduino(msg) {
    write("ARDUINO", msg);
  },

  close() {
    return new Promise(resolve => {
      stream.end(resolve);
    });
  }
};