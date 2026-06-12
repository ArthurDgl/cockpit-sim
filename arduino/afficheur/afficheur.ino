#include <LedControl.h>

LedControl lc = LedControl(8, 7, 6, 1);

void setup() {
    Serial.begin(115200);
  lc.shutdown(0, false);
  lc.setIntensity(0, 8);
  lc.clearDisplay(0);
}

void loop(){
    if(Serial.available() > 0){
        String line = Serial.readStringUntil('\n');
        int value = line.toInt();
    }
}

