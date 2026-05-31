#include <Wire.h>
#define PCF_1 0x20  

volatile bool pcfInterrupt = false;
uint8_t usedAddresses = 0;

void setup() {
  Serial.begin(115200);
  printMessage("Program started");

  Wire.begin();

  Wire.beginTransmission(PCF_1);
  if(Wire.endTransmission() != 0) {
    printMessage("PCF not responding : Aborting...");
    while(1);
  }

  for (int i = 0; i < 8; i++) {
    int address = convertIntToAddress(i);

    Wire.beginTransmission(address);
    if(Wire.endTransmission() != 0) {
      printMessagePrefix();
      Serial.print("PCF Extender ");
      Serial.print(i);
      Serial.print(" at address ");
      Serial.print(address);
      Serial.print(" isn't responding, ignoring it...");
      printMessageSuffix();
      continue;
    }

    printMessagePrefix();
    Serial.print("Successfully connected to PCF Extender ");
    Serial.print(i);
    Serial.print(" at address ");
    Serial.print(address);
    printMessageSuffix();

    Wire.beginTransmission(address);
    Wire.write(0b11111111);
    Wire.endTransmission();

    usedAddresses |= 1 << i;
  }

  pinMode(3, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(3), handlePCFInterrupt, FALLING);
}

void handlePCFInterrupt() {
    pcfInterrupt = true;
}

void readI2C(int address) {
  byte I2CResponse;

  Wire.requestFrom(address, 1);

  if(Wire.available()) {
    I2CResponse = Wire.read();
    printPCFValue(address, I2CResponse);
  } else {
    printMessage("Failed to get value");
  }
}

void loop() {
  if (pcfInterrupt) {
    pcfInterrupt = false;

    for (int i = 0; i < 8; i++) {
      if (!((usedAddresses >> i) & 0b00000001)) continue;
      readI2C(convertIntToAddress(i));
    }
  }
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

void printPCFValue(int pcfAddress, byte value) {
  Serial.print("{\"action\":\"PCFValue\",\"address\":");
  Serial.print(convertAddressToInt(pcfAddress));
  Serial.print(",\"value\":");
  print8bitValue(value);
  Serial.println("}");
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