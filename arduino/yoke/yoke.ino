#define AVG_RATIO 3.0
#define PIN_COUNT 6

#define CS   10
#define RD   11
#define WR   12
#define DATA 13

#define  BIAS     0x52             //0b1000 0101 0010  1/3duty 4com
#define  SYSDIS   0X00             //0b1000 0000 0000  关振系统荡器和LCD偏压发生器 - Off-center oscillator and LCD bias generator
#define  SYSEN    0X02             //0b1000 0000 0010 打开系统振荡器 - Turn on the system oscillator
#define  LCDOFF   0X04             //0b1000 0000 0100  关LCD偏压 - LCD bias off
#define  LCDON    0X06             //0b1000 0000 0110  打开LCD偏压 - Turn on LCD bias
#define  XTAL     0x28             //0b1000 0010 1000 外部接时钟 - External clock
#define  RC256    0X30             //0b1000 0011 0000  内部时钟 - internal clock
#define  TONEON   0X12             //0b1000 0001 0010  打开声音输出 - Turn on sound output
#define  TONEOFF  0X10             //0b1000 0001 0000 关闭声音输出 - Turn off sound output
#define  WDTDIS1  0X0A             //0b1000 0000 1010  禁止看门狗 - No guard dogs allowed ???

void wrDATA(unsigned char data, unsigned char cnt) {
	unsigned char i;
	for (i = 0; i < cnt; i++) {
		digitalWrite(WR, LOW);
		delayMicroseconds(4);
		if (data & 0x80) {
			digitalWrite(DATA, HIGH);
		}
		else {
			digitalWrite(DATA, LOW);
		}
		digitalWrite(WR, HIGH);
		delayMicroseconds(4);
		data <<= 1;
	}
}

void wrone(unsigned char addr, unsigned char sdata)
{
	addr <<= 2;
	digitalWrite(CS, LOW);
	wrDATA(0xa0, 3);
	wrDATA(addr, 6);
	wrDATA(sdata, 8);
	digitalWrite(CS, HIGH);
}

void wrCMD(unsigned char CMD) {  //100
	digitalWrite(CS, LOW);
	wrDATA(0x80, 4);
	wrDATA(CMD, 8);
	digitalWrite(CS, HIGH);
}

void config()
{
	wrCMD(BIAS);
	wrCMD(RC256);
	wrCMD(SYSDIS);
	wrCMD(WDTDIS1);
	wrCMD(SYSEN);
	wrCMD(LCDON);
}

void wrclrdata(unsigned char addr, unsigned char sdata)
{
	addr <<= 2;
	digitalWrite(CS, LOW);
	wrDATA(0xa0, 3);
	wrDATA(addr, 6);
	wrDATA(sdata, 8);
	digitalWrite(CS, HIGH);
}

void clear(){
	wrCLR(16);
}

void wrCLR(unsigned char len) {
	unsigned char addr = 0;
	unsigned char i;
	for (i = 0; i < len; i++) {
		wrclrdata(addr, 0x00);
		addr = addr + 2;
	}
}

const char convert[16] = {0xDB, 0x50, 0xE7, 0xF5, 0x7C, 0xBD, 0xBF, 0xD0, 0xFF, 0xFD, 0xFE, 0x3F, 0x8B, 0x77, 0xAF, 0xAE};
char digitToSeg(char digit) {
  char index = digit & 0x0F;
  return convert[index];
}

void displayByte(char addr, char byte) {
  wrone(addr, digitToSeg(byte));
  wrone(addr+2, digitToSeg(byte>>4));
}

void displayBytes(int bytes, int dots) {
  if (dots) {
    wrone(0x04, 0b0001 << 4);
    wrone(0x0D, 0b0100 << 4);
  } else {
    wrone(0x04, 0);
    wrone(0x0D, 0);
  }
  displayByte(0x00, bytes);
  displayByte(0x05, bytes >> 8);
  displayByte(0x09, bytes >> 16);
}

const int pins[PIN_COUNT] = {D0, D1, D2, D3, D4, D5};

const int ROLL_MAX = 523;
const int ROLL_MIN = 279;

const int PITCH_MAX = 607;
const int PITCH_MIN = 380;

const int PDL_LEFT_MAX = 581;
const int PDL_LEFT_MIN = 0;

const int PDL_RIGHT_MAX = 1022;
const int PDL_RIGHT_MIN = 560;

void setupDigitalPins() {
  for (int i = 0; i < PIN_COUNT; i++) {
    pinMode(pins[i], INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(pins[i]), digitalISR, CHANGE);
  }
}

volatile int interrupt = false;
void digitalISR() {
  interrupt = true;
}

int lastValues = 0;
void testPinChanges() {
  for (int i = 0; i < PIN_COUNT; i++) {
    int current = digitalRead(pins[i]);
    if (((lastValues >> i) & 1) ^ current) {
      sendPinValue(pins[i], current);
      lastValues ^= 1 << i;
    }
  }
}

void handleInterrupt() {
  interrupt = false;
  testPinChanges();
}

void sendPinValue(int pin, int value) {
  Serial.print("{\"action\":\"YokePinValue\",\"pin\":");
  Serial.print(pin);
  Serial.print(",\"value\":");
  Serial.print(value);
  Serial.println("}");
}

void setup() {
  pinMode(CS, OUTPUT);
	pinMode(WR, OUTPUT);
	pinMode(DATA, OUTPUT);

  config();

  clear();

  Serial.begin(115200);
  setupDigitalPins();
}

int displayed = 0;
void display() {
  int lz = displayed < 0;
  displayBytes(lz ? -displayed : displayed, lz);
}

unsigned long lastBlink = 0;

void loop() {
  if (Serial.available() > 0) {
    displayed = Serial.parseInt();
    while (Serial.available() > 0) {
      Serial.read();
    }
    display();
  }

  if (interrupt) {
    handleInterrupt();
  }

  if (millis() - lastBlink > 50) {
    lastBlink = millis();
    processYoke();
    processPedals();
    testPinChanges();
    display();
  }
}

float avg_roll = 0.0;
float avg_pitch = 0.0;

float last_roll = 0.0;
float last_pitch = 0.0;

void processYoke() {
  int val_roll = analogRead(A4);
  int val_pitch = analogRead(A5);

  float roll = ((float) (val_roll - ROLL_MIN)) / (float) (ROLL_MAX - ROLL_MIN);
  float pitch = ((float) (val_pitch - PITCH_MIN)) / (float) (PITCH_MAX - PITCH_MIN);

  roll = roll * 2.0 - 1.0 - 0.07;
  pitch = pitch * 2.0 - 1.0 - 0.01;

  avg_roll = (AVG_RATIO * avg_roll + roll) / (AVG_RATIO + 1.0);
  avg_pitch = (AVG_RATIO * avg_pitch + pitch) / (AVG_RATIO + 1.0);

  roll = avg_roll;
  pitch = avg_pitch;

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

float avg_pdl_left = 0.0;
float avg_pdl_right = 0.0;

float last_pdl_left = 0.0;
float last_pdl_right = 0.0;

void processPedals() {
  int val_pdl_left = analogRead(A3);
  int val_pdl_right = analogRead(A2);

  float pdl_left = ((float) (val_pdl_left - PDL_LEFT_MIN)) / (float) (PDL_LEFT_MAX - PDL_LEFT_MIN);
  float pdl_right = ((float) (val_pdl_right - PDL_RIGHT_MIN)) / (float) (PDL_RIGHT_MAX - PDL_RIGHT_MIN);

  pdl_left = pdl_left - 0.00;
  pdl_right = pdl_right - 0.00;

  avg_pdl_left = (AVG_RATIO * avg_pdl_left + pdl_left) / (AVG_RATIO + 1.0);
  avg_pdl_right = (AVG_RATIO * avg_pdl_right + pdl_right) / (AVG_RATIO + 1.0);

  pdl_left = avg_pdl_left;
  pdl_right = avg_pdl_right;

  if (abs(pdl_left) <= 0.05) pdl_left = 0.0;
  if (abs(pdl_right) <= 0.05) pdl_right = 0.0;

  if (abs(last_pdl_left - pdl_left) >= 0.01 || abs(last_pdl_right - pdl_right) >= 0.01) {
    Serial.print("{\"action\":\"PEDALS\", \"pdl_left\":");
    Serial.print(pdl_left);
    
    Serial.print(",\"pdl_right\":");
    Serial.print(pdl_right);
    Serial.println("}");

    last_pdl_left = pdl_left;
    last_pdl_right = pdl_right;
  }
}
