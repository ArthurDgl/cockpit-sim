#include <LedControl.h>

LedControl lc = LedControl(2, 4, 3, 2);
LedControl lc2 = LedControl(5, 7, 6, 6);

void setup() {
    for (int d = 0; d < 2; d++) {
        lc.shutdown(d, false);
        lc.setIntensity(d, 8);
        lc.clearDisplay(d);

        for (int digit = 0; digit < 8; digit++) {
            lc.setDigit(d, digit, d, false);
        }
    }
    for (int d = 0; d < 6; d++) {
        lc2.shutdown(d, false);
        lc2.setIntensity(d, 8);
        lc2.clearDisplay(d);

        for (int digit = 0; digit < 8; digit++) {
            lc2.setDigit(d, digit, d, false);
        }
    }
}

void loop() {

}