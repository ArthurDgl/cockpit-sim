#include <LedControl.h>

#define INTENSITY 1


LedControl lc1 = LedControl(2, 4, 3, 2);
LedControl lc2 = LedControl(5, 7, 6, 2);
LedControl lc3 = LedControl(8, 10, 9, 2);
LedControl lc4 = LedControl(11, 13, 12, 2);
LedControl lc5 = LedControl(A3, A4, A5, 2);
LedControl *controls[] = {&lc1, &lc2, &lc3, &lc4, &lc5};
int cN = 5;
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
    initLc(lc5);
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
    int useDot = control & 0x100;

    if (ci < 0 || ci >= cN) return;

    displayOnLc(*controls[ci], control, value, useDot);
}

long value[] = {0, 0, 0, 0, 0, 0};

void displayOnLc(LedControl lc, unsigned long control, unsigned long value, int useDot) {
    int di = (control >> 4) & 0xF;
    lc.shutdown(di, false);
    lc.setIntensity(di, INTENSITY);
    // lc.clearDisplay(di);
    for (int i = 0; i < 8; i++) {
        int val = (value >> i*4) & 0xF;
        int dp = i == 4 && useDot;
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
        lc.setIntensity(d, INTENSITY);
        lc.setIntensity(d, INTENSITY);
        lc.setIntensity(d, INTENSITY);
        lc.setIntensity(d, INTENSITY);
        // lc.clearDisplay(d);

        for (int digit = 0; digit < 8; digit++) {
            lc.setDigit(d, digit, 0, false);
        }
    }
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