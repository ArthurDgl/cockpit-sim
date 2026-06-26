#include <Wire.h>
#include "rgb_lcd.h"

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

const uint8_t muxPins[] = {A5, A6};
#define MUX_n 2

const int customPins[5] = {30, 38, 13, 7, 27};
const int customPinsN = 5;

volatile bool PinExtenderInterrupt = false;
uint8_t usedAddresses = 0;

rgb_lcd lcd;

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

  for (int i = 0; i < customPinsN; i++) {
    pinMode(customPins[i], INPUT_PULLUP);
  }

  initLCD();
}

void handlePinExtenderInterrupt() {
    PinExtenderInterrupt = true;
}

unsigned long last_blink = 0;

long zulutime = 0;
long localtime = 0;
void loop() {
  if (PinExtenderInterrupt) {
    PinExtenderInterrupt = false;

    for (int i = 0; i < 8; i++) {
      if (!((usedAddresses >> i) & 0b00000001)) continue;
      readI2C(convertIntToAddress(i));
    }
  }

  if (Serial.available() > 0) {
    long received = Serial.parseInt();
    while (Serial.available() > 0) {
      Serial.read();
    }

    if (received & 0x8000) localtime = received - 0x8000;
    else zulutime = received;
  }

  if (millis() - last_blink > 100) {
    last_blink = millis();
    
    readMux(0);
    readMux(1);

    readCustomPins();

    printlcdscreen("ZULU:   ",0,0);
    printTime(zulutime,8,0);

    printlcdscreen("LOCAL:",0,1);
    printTime(localtime,8,1);
  }
}

void initLCD() {
    lcd.begin(16, 2);
    lcd.clear();
}

void printlcdscreen(char* message, int column , int row){
    lcd.setCursor(0, row);
    lcd.print("                ");  // Clear line
    lcd.setCursor(column, row);
    lcd.print(message);
}

void printTime(int totalSeconds, int column, int row) {
    uint32_t hours   =  totalSeconds / 3600;
    uint32_t minutes = (totalSeconds % 3600) / 60;
    uint32_t seconds =  totalSeconds % 60;
 
    char timeStr[9];   // "HH:MM:SS" + null terminator
    sprintf(timeStr, "%02lu:%02lu:%02lu", hours, minutes, seconds);
 
    lcd.setCursor(column, row);
    lcd.print(timeStr);
}

void readCustomPins() {
  Serial.print("{\"action\":\"CustomPins\",\"values\":[");
  for (int i = 0; i < customPinsN; i++) {
    Serial.print(digitalRead(customPins[i]));
    if (i < customPinsN - 1) Serial.print(",");
  }
  Serial.println("]}");
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