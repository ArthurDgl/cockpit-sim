const int ROLL_MAX = 523;
const int ROLL_MIN = 279;

const int PITCH_MAX = 607;
const int PITCH_MIN = 380;

void setup() {
  Serial.begin(9600);
}

float last_roll = 0.0;
float last_pitch = 0.0;

void loop() {
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
  
  delay(50);
}