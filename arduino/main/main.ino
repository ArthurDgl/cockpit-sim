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

const int ROLL_MAX = 523;
const int ROLL_MIN = 279;

const int PITCH_MAX = 607;
const int PITCH_MIN = 380;

void setup() {
  Serial.begin(115200);

  pinMode(pinCLK, INPUT_PULLUP);
  pinMode(pinDT, INPUT_PULLUP);

  pinMode(pinPSH, INPUT_PULLUP);

  // Attach interrupts to both encoder pins
  attachInterrupt(digitalPinToInterrupt(pinCLK), readEncoder, CHANGE);
  attachInterrupt(digitalPinToInterrupt(pinDT),  readEncoder, CHANGE);
}

float last_roll = 0.0;
float last_pitch = 0.0;

unsigned long last_blink = 0;

void loop() {
  static int lastPos = 0;

  if (lastPos != truePos) {
    uint8_t pushed = !digitalRead(pinPSH);
    int mult = pushed ? 10 : 1;

    counter += (truePos - lastPos) * mult;

    Serial.print("{\"action\":\"ROT_TEST\", \"value\":");
    Serial.print(counter);
    Serial.println("}");
    
    lastPos = truePos;
  }

  if (millis() - last_blink > 50) {
    last_blink = millis();
    processYoke();
  }
}

void processYoke() {
  int val_roll = analogRead(A4);
  int val_pitch = analogRead(A5);

  float roll = ((float) (val_roll - ROLL_MIN)) / (float) (ROLL_MAX - ROLL_MIN);
  float pitch = ((float) (val_pitch - PITCH_MIN)) / (float) (PITCH_MAX - PITCH_MIN);

  roll = roll * 2.0 - 1.0 - 0.07;
  pitch = pitch * 2.0 - 1.0 - 0.01;

  if (abs(roll) <= 0.05) roll = 0.0;
  if (abs(pitch) <= 0.05) pitch = 0.0;

  if (abs(last_roll - roll) >= 0.01 || abs(last_pitch - pitch) >= 0.01) {
    Serial.print("{\"action\":\"YOKE\", \"roll\":");
    Serial.print(roll);
    
    Serial.print(",\"pitch\":");
    Serial.print(pitch);
    Serial.println("}");

    last_roll = roll;
    last_pitch = pitch;
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
  truePos = encoderPos / 4 - (encoderPos < 0 ? 1 : 0);
}