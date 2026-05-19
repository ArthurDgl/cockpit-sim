// EC11 Rotary Encoder example using interrupts
// CLK -> pin 2
// DT  -> pin 3
// GND -> GND
// VCC -> 5V

volatile int encoderPos = 0;
volatile int truePos = 0;

int counter = 0;

const int pinCLK = 2;
const int pinDT  = 3;
const int pinPSH = 4;

void setup() {
  Serial.begin(115200);

  pinMode(pinCLK, INPUT_PULLUP);
  pinMode(pinDT, INPUT_PULLUP);

  pinMode(pinPSH, INPUT_PULLUP);

  // Attach interrupts to both encoder pins
  attachInterrupt(digitalPinToInterrupt(pinCLK), readEncoder, CHANGE);
  attachInterrupt(digitalPinToInterrupt(pinDT),  readEncoder, CHANGE);
}

void loop() {
  static int lastPos = 0;

  // Print only when position changes
  if (lastPos != truePos) {
    uint8_t pushed = !digitalRead(pinPSH);
    int mult = pushed ? 10 : 1;

    counter += (truePos - lastPos) * mult;

    Serial.print("{\"value\":");
    Serial.print(counter);
    Serial.println("}");
    
    lastPos = truePos;
  }
}

void readEncoder() {
  static uint8_t lastState = 0;

  uint8_t currentState =
      (digitalRead(pinCLK) << 1) |
       digitalRead(pinDT);

  // Gray-code state transitions
  if ((lastState == 0b00 && currentState == 0b01) ||
      (lastState == 0b01 && currentState == 0b11) ||
      (lastState == 0b11 && currentState == 0b10) ||
      (lastState == 0b10 && currentState == 0b00)) {
    encoderPos++;
  }

  if ((lastState == 0b00 && currentState == 0b10) ||
      (lastState == 0b10 && currentState == 0b11) ||
      (lastState == 0b11 && currentState == 0b01) ||
      (lastState == 0b01 && currentState == 0b00)) {
    encoderPos--;
  }

  lastState = currentState;
  truePos = encoderPos / 4;
}