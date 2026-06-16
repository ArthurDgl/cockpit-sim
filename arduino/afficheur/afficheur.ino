#include <LedControl.h>

LedControl lc1 = LedControl(2, 4, 3, 2);
LedControl lc2 = LedControl(5, 7, 6, 2);
LedControl lc3 = LedControl(8, 10, 9, 2);
LedControl lc4 = LedControl(11, 13, 12, 2);
LedControl *controls[] = {&lc1, &lc2, &lc3, &lc4};
int cN = 4;
char serialBuffer[32];

void setup() {
    Serial.begin(115200);
    Serial.setTimeout(20);

    for (int i = 0; i < 10; i++) {
        inits();
        delay(50);
    }
}

void inits() {
    initLc(lc1);
    initLc(lc2);
    initLc(lc3);
    initLc(lc4);
}

void loop() {
    while (Serial.available() > 0) {
        size_t length = Serial.readBytesUntil('\n', serialBuffer, sizeof(serialBuffer) - 1);
        if (length == 0) {
            continue;
        }

        serialBuffer[length] = '\0';

        char *separator = strchr(serialBuffer, ',');
        if (separator == NULL) {
            continue;
        }

        *separator = '\0';

        unsigned long control = strtoul(serialBuffer, NULL, 10);
        unsigned long value = strtoul(separator + 1, NULL, 10);
        display(control, value);
    }
}

void display(unsigned long control, unsigned long value) {
    int ci = control & 0xF;

    if (ci < 0 || ci >= cN) return;

    displayOnLc(*controls[ci], control, value);
}

void displayOnLc(LedControl lc, unsigned long control, unsigned long value) {
    int di = (control >> 4) & 0xF;
    lc.shutdown(di, false);
    lc.setIntensity(di, 1);
    lc.clearDisplay(di);
    for (int i = 0; i < 8; i++) {
        int val = (value >> i*4) & 0xF;
        int dp = i == 4;
        if (val == 0xF) lc.setChar(di, i, ' ', dp);
        else lc.setDigit(di, i, val, dp);
    }
}

void initLc(LedControl lc) {
    for (int d = 0; d < 2; d++) {
        lc.shutdown(d, false);
        lc.shutdown(d, false);
        lc.shutdown(d, false);
        lc.shutdown(d, false);
        lc.setIntensity(d, 1);
        lc.setIntensity(d, 1);
        lc.setIntensity(d, 1);
        lc.setIntensity(d, 1);
        // lc.clearDisplay(d);

        for (int digit = 0; digit < 8; digit++) {
            lc.setDigit(d, digit, 0, false);
        }
    }
}