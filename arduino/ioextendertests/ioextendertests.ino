#include <Wire.h>
#define PCF_1 0x20  

volatile bool pcfInterrupt = false;

void setup() {
  Serial.begin(9600);
  Serial.println("Program started");

  Wire.begin();

  Wire.beginTransmission(PCF_1);
  if(Wire.endTransmission() != 0) {
    Serial.print(F("PCF not responding"));
    Serial.println(PCF_1, HEX);
    Serial.println(F("Aborting..."));
    while(1);
  }

  Wire.beginTransmission(PCF_1);
  Wire.write(0b11111111);
  Wire.endTransmission();

  pinMode(3, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(3), handlePCFInterrupt, FALLING);
}

void handlePCFInterrupt() {
    pcfInterrupt = true;
}

void readI2C(int address) {
  byte reponseI2C;

  Wire.requestFrom(address, 1);

  if(Wire.available()) {
    reponseI2C = Wire.read();
    print8bitValue(reponseI2C);
  } else {
    Serial.println(F("[ERROR] Failed to get value"));
  }
}

void loop() {
  if (pcfInterrupt) {
    pcfInterrupt = false;
    readI2C(PCF_1);
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
  Serial.println();
}