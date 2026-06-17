#include <Wire.h>

#define IODIRA 0x00
#define IODIRB 0x01

#define GPIOA 0x12
#define GPIOB 0x13

#define GPPUA 0x0C
#define GPPUB 0x0D

#define GPINTENA  0x04
#define GPINTENB  0x05

#define INTCONA   0x08
#define INTCONB   0x09

#define IOCON     0x0A

const int selectPins[4] = {52, 51, 50, 49};

const uint8_t muxPins[] = {A0, A1};
#define MUX_n 2

volatile bool PinExtenderInterrupt = false;
uint8_t usedAddresses = 0;

void setup() {
  Serial.begin(115200);
  printMessage("Program started");

  Wire.begin();

  for (int i = 0; i < 8; i++) {
    int address = convertIntToAddress(i);

    Wire.beginTransmission(address);
    if(Wire.endTransmission() != 0) {
      printMessagePrefix();
      Serial.print("PinExtender Extender ");
      Serial.print(i);
      Serial.print(" at address ");
      Serial.print(address);
      Serial.print(" isn't responding, ignoring it...");
      printMessageSuffix();
      continue;
    }

    printMessagePrefix();
    Serial.print("Successfully connected to PinExtender Extender ");
    Serial.print(i);
    Serial.print(" at address ");
    Serial.print(address);
    printMessageSuffix();

    writeRegister(address, IODIRA, 0xFF);
    writeRegister(address, IODIRB, 0xFF);

    writeRegister(address, GPPUA, 0xFF);
    writeRegister(address, GPPUB, 0xFF);

    writeRegister(address, INTCONA, 0x00);
    writeRegister(address, INTCONB, 0x00);

    writeRegister(address, GPINTENA, 0xFF);
    writeRegister(address, GPINTENB, 0xFF);

    uint8_t iocon = 0b01000100; // MIRROR + ODR
    writeRegister(address, IOCON, iocon);

    usedAddresses |= 1 << i;
  }

  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(2), handlePinExtenderInterrupt, FALLING);
  attachInterrupt(digitalPinToInterrupt(3), handlePinExtenderInterrupt, FALLING);

  for (int i = 0; i < 4; i++) {
    pinMode(selectPins[i], OUTPUT);
  }

  for (int i = 0; i < MUX_n; i++) {
    pinMode(muxPins[i], INPUT_PULLUP);
  }
}

void handlePinExtenderInterrupt() {
    PinExtenderInterrupt = true;
}

unsigned long last_blink = 0;

void loop() {
  if (PinExtenderInterrupt) {
    PinExtenderInterrupt = false;

    for (int i = 0; i < 8; i++) {
      if (!((usedAddresses >> i) & 0b00000001)) continue;
      readI2C(convertIntToAddress(i));
    }
  }

  if (millis() - last_blink > 50) {
    last_blink = millis();
    
    readMux(0);
    readMux(1);
  }
}

void readMux(int mux_offset) {
  Serial.print("{\"action\":\"MuxPinValue\",\"id\":");
  Serial.print(mux_offset);
  Serial.print(",\"values\":[");
  for (int i = 0; i < 16; i++) {
    Serial.print(readMuxValue(mux_offset, i));
    if (i < 15) Serial.print(",");
  }
  Serial.println("]}");
}

int readMuxValue(int mux_offset, int address) {
  setSelectAddress(address);
  delayMicroseconds(1);
  analogRead(muxPins[mux_offset]);
  int value = analogRead(muxPins[mux_offset]);
  return value;
}

void setSelectAddress(int address) {
  for (int i = 0; i < 4; i++) {
    int bit = (address >> i) & 1;
    digitalWrite(selectPins[i], bit);
  }
}

void writeRegister(uint8_t addr, uint8_t reg, uint8_t value)
{
    Wire.beginTransmission(addr);
    Wire.write(reg);
    Wire.write(value);
    Wire.endTransmission();
}

uint8_t readRegister(uint8_t addr, uint8_t reg)
{
    Wire.beginTransmission(addr);
    Wire.write(reg);
    Wire.endTransmission(false);  // repeated start

    Wire.requestFrom(addr, 1);

    if (Wire.available())
        return Wire.read();

    return 0;
}

void readI2C(int address) {
  uint8_t portA = readRegister(address, GPIOA);
  uint8_t portB = readRegister(address, GPIOB);

  print2PinExtenderValues(address, portB, portA);
}
  
void print8bitValue(byte value) {
  Serial.print((value >> 7) & 0b00000001);
  Serial.print((value >> 6) & 0b00000001);
  Serial.print((value >> 5) & 0b00000001);
  Serial.print((value >> 4) & 0b00000001);
  Serial.print((value >> 3) & 0b00000001);
  Serial.print((value >> 2) & 0b00000001);
  Serial.print((value >> 1) & 0b00000001);
  Serial.print((value >> 0) & 0b00000001);
}

void printPinExtenderValue(int PinExtenderAddress, byte value) {
  Serial.print("{\"action\":\"PinExtenderValue\",\"address\":");
  Serial.print(convertAddressToInt(PinExtenderAddress));
  Serial.print(",\"value\":");
  print8bitValue(value);
  Serial.println("}");
}

void print2PinExtenderValues(int PinExtenderAddress, byte valueA, byte valueB) {
  Serial.print("{\"action\":\"PinExtenderValue\",\"address\":");
  Serial.print(convertAddressToInt(PinExtenderAddress));
  Serial.print(",\"value\":\"");
  print8bitValue(valueA);
  print8bitValue(valueB);
  Serial.println("\"}");
}

void printMessagePrefix() {
  Serial.print("{\"action\":\"message\",\"message\":\"");
}

void printMessageSuffix() {
  Serial.println("\"}");
}

void printMessage(char *str) {
  printMessagePrefix();
  Serial.print(str);
  printMessageSuffix();
}

int convertIntToAddress(int value) {
  return 0x20 + value;
}

int convertAddressToInt(int address) {
  return address - 0x20;
}