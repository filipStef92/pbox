#include <float.h>
#include <limits.h>
#include <LWiFi.h>
#include <LWiFiClient.h>
#include <PubSubClient.h>
#include <ATT_IOT.h>
#include <Grove_LED_Bar.h>
#include <SPI.h>  //required to have support for signed/unsigned long type.
#include <LGPS.h>
#include <DHT.h>
#include <Wire.h>
#include <ADXL345.h>

#define WIFI_AP "cdb guest"
#define WIFI_PASSWORD "kodbihajnd"
#define WIFI_AUTH LWIFI_WPA  // choose from LWIFI_OPEN, LWIFI_WPA, or LWIFI_WEP according to your WiFi AP configuration
#define LS_PEAK_VALUE   540
#define THRESHOLD       (2)
#define VIBRATOR        6
#define HUMID_AND_TEMP  4
#define LIGHTSNSR       A0
#define BTN_PIN         3
#define ACCEL_THRESHOLD 10

/*
 * ACCEL_MODE stands for ACCELEROMETER MODE. 0 = raw acceleration data, 1 = color
 */
#define ACCEL_MODE      1

gpsSentenceInfoStruct info;
LWiFiClient wifiClient;
Grove_LED_Bar led_bar(9, 8, false);
DHT dht(HUMID_AND_TEMP, DHT22);
ADXL345 accelerometer; //variable adxl is an instance of the ADXL345 library

char deviceId[] = "PdgYKiVwn3bErbb0HVQRk2Ea";
char clientId[] = "daniavram";
char clientKey[] = "tcndvrfznop";
byte mac[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x01};  //Adapt to your Arduino MAC address if needed

double latitude;
double longitude;
bool sendFlag = 0;
volatile bool changeSendFlag = 0;

//required for the device connection
void callback(char* topic, byte* payload, unsigned int length);
char httpServer[] = "api.smartliving.io";
char* mqttServer = "broker.smartliving.io";
PubSubClient pubSub(mqttServer, 1883, callback, wifiClient);
ATTDevice Device(deviceId, clientId, clientKey);  //create the object that provides the connection to the cloud to manage the device.

void setup() {
  
  initAndPowerOn();
  connectToHttpAndMqtt();
  delay(3000);
  initAccelerometer();
  led_bar.setLevel(0);
}

void loop(){

  PBox_500ms();
  PBox_1sec();
  PBox_5sec();
}

// Callback function: handles messages that were sent from the IOT platform to this device.

void callback(char* topic, byte* payload, unsigned int length)
{
  String msgString;
  
    char message_buff[length + 1];  //need to copy over the payload so that we can add a /0 terminator, this can then be wrapped inside a string for easy manipulation.
    strncpy(message_buff, (char*)payload, length);  //copy over the data
    message_buff[length] = '\0';   //make certain that it ends with a null

    msgString = String(message_buff);
    msgString.toLowerCase();  //to make certain that our comparison later on works ok (it could be that a True or False was sent)
  

  int* idOut = NULL;

  
    // get asset pin
    int pinNr = Device.GetPinNr(topic, strlen(topic));

    if (pinNr == 100) {
      sendFlag = atoi(message_buff);
    } else if (pinNr == 8) {
        led_bar.setLevel(atoi(message_buff));
      } else if (pinNr == 6) {
          digitalWrite(VIBRATOR, atoi(message_buff));
      }
    
    //Serial.print("Payload: ");
    //Serial.println(msgString);
    //Serial.print("topic: ");
    //Serial.println(topic);
    
  
  if(idOut != NULL)
    Device.Send(msgString, *idOut);
}

/*
 * Recurring functions
 */

void PBox_500ms() {

  static unsigned long currentTime = 0;
  static unsigned long time = 0;
  
  currentTime = millis();

  if (currentTime > (time + 500)) {

    PBox__Accelerometer();
      
    time = currentTime;
    Device.Process();
  }
  
}

void PBox_1sec() {

  static unsigned long currentTime = 0;
  static unsigned long time = 0;
  
  
  currentTime = millis();

  if (currentTime > (time + 1000)) {

    PBox__LightSnsr();
    PBox__UpdateSendFlag();
      
    time = currentTime;
    Device.Process();
  }
  
}

void PBox_5sec() {

  static unsigned long currentTime = 0;
  static unsigned long time = 0;

  currentTime = millis();

  if (currentTime > (time + 5000)) {
    
    PBox__TempAndHumSnsr();
    PBox__GPS();
  
    time = currentTime;
  }
  
}

void PBox__LightSnsr() {

  static unsigned int lightRead = 0;
  static unsigned long prevLightRead = ULONG_MAX;
  static unsigned long lightReadDelta = 0;

  if (sendFlag) {
    lightRead = analogRead(LIGHTSNSR);  // read from light sensor
    
    if (prevLightRead >= lightRead) {
      lightReadDelta = prevLightRead - lightRead;
    } else {
      lightReadDelta = lightRead - prevLightRead;  
    }
    
  } else {
    lightRead = 0;
    lightReadDelta = THRESHOLD;  
  }

  if (prevLightRead != lightRead) {
    if (lightReadDelta >= THRESHOLD) {
      Device.Send(String(lightRead), LIGHTSNSR);
    }
    prevLightRead = lightRead;
  }
  
}

void PBox__TempAndHumSnsr() {

  static float temperature = 0.0;
  static float humidity = 0.0;
  static float prevTemperature = FLT_MAX;
  static float prevHumidity = FLT_MAX;

  if (sendFlag) {
    dht.readHT(&temperature, &humidity);
  } else {
    temperature = 0.0;
    humidity = 0.0;
  }

  if (prevTemperature != temperature) {
    Device.Send(String(temperature), 20);
    prevTemperature = temperature;
  }

  if (prevHumidity != humidity) {
    Device.Send(String(humidity), 21);
    prevHumidity = humidity;
  }
  
}

void PBox__Accelerometer() {

  static double accelerometerAcceleration[3];
  static double prevAccelerometerAcceleration[3] = {DBL_MAX, DBL_MAX, DBL_MAX};
  static bool sendAccel = false;

#if (ACCEL_MODE == 1)
  int x,y,z;
#endif

  if (sendFlag) {
    #if (ACCEL_MODE == 0)
    accelerometer.getAcceleration(accelerometerAcceleration);
    #endif
    #if (ACCEL_MODE == 1)
    accelerometer.readXYZ(&x, &y, &z);
    accelerometerAcceleration[0] = x % 255;
    accelerometerAcceleration[1] = y % 255;
    accelerometerAcceleration[2] = z % 255;
    #endif
  } else {
    accelerometerAcceleration[0] = 0.0;
    accelerometerAcceleration[1] = 0.0;
    accelerometerAcceleration[2] = 0.0;  
  }

  double difference = 0;

  if (accelerometerAcceleration[0] >= prevAccelerometerAcceleration[0]) {
    difference = accelerometerAcceleration[0] - prevAccelerometerAcceleration[0];
  } else {
    difference = prevAccelerometerAcceleration[0] - accelerometerAcceleration[0];
  }
  if (difference > ACCEL_THRESHOLD) {
    prevAccelerometerAcceleration[0] = accelerometerAcceleration[0];
    sendAccel = true;
  }

  if (accelerometerAcceleration[1] >= prevAccelerometerAcceleration[1]) {
    difference = accelerometerAcceleration[1] - prevAccelerometerAcceleration[1];
  } else {
    difference = prevAccelerometerAcceleration[1] - accelerometerAcceleration[1];
  }
  if (difference > ACCEL_THRESHOLD) {
    prevAccelerometerAcceleration[1] = accelerometerAcceleration[1];
    sendAccel = true;
  }

  if (accelerometerAcceleration[2] >= prevAccelerometerAcceleration[2]) {
    difference = accelerometerAcceleration[2] - prevAccelerometerAcceleration[2];
  } else {
    difference = prevAccelerometerAcceleration[2] - accelerometerAcceleration[2];
  }
  if (difference > ACCEL_THRESHOLD) {
    prevAccelerometerAcceleration[2] = accelerometerAcceleration[2];
    sendAccel = true;
  }

  if (sendAccel) {
    char* accelStr = new char[30];
    sprintf(accelStr, "{\"r\":%d,\"g\":%d,\"b\":%d}\0", (int)prevAccelerometerAcceleration[0], (int)prevAccelerometerAcceleration[1], (int)prevAccelerometerAcceleration[2]);
    //sprintf(accelStr, "X:%4.2f,Y:%4.2f,Z:%4.2f\0", prevAccelerometerAcceleration[0], prevAccelerometerAcceleration[1], prevAccelerometerAcceleration[2]);
    Device.Send(String(accelStr), 80);
    Device.Send(String(accelStr), 30);
    delete accelStr;
    sendAccel = false;
  }
  

}

void PBox__GPS() {

  if (sendFlag) {
    LGPS.getData(&info);
    parseGPGGA((const char*)info.GPGGA);
    
    char* gpsJson = new char[40];
    sprintf(gpsJson, "{\"latitude\":%8.6f,\"longitude\":%8.6f}\0",latitude, longitude);
    Device.Send(String(gpsJson), 99);
    delete gpsJson;
  }
}

void PBox__UpdateSendFlag() {

  if (changeSendFlag) {
    sendFlag = !sendFlag;
    Device.Send(String(sendFlag), 100);
    changeSendFlag = 0;
  }
}

void btnInterrupt() {
  changeSendFlag = 1;
}

/*
 * Init functions
 */


void initAndPowerOn() {
  
  Serial.begin(9600);  // init serial link for debugging
  pinMode(VIBRATOR, OUTPUT);
  pinMode(BTN_PIN, INPUT);
  attachInterrupt(1, btnInterrupt, CHANGE);
  digitalWrite(VIBRATOR, LOW);
  led_bar.begin();
  LGPS.powerOn();
  dht.begin();
  accelerometer.powerOn();
}


void connectToHttpAndMqtt() {
  
  while (0 == LWiFi.connect(WIFI_AP, LWiFiLoginInfo(WIFI_AUTH, WIFI_PASSWORD))){
    Serial.println("Connecting to WiFi ");
    Serial.print(WIFI_AP);
    Serial.println();
    delay(600);
  }
  Serial.println("Connected!");

  while(!Device.Connect(&wifiClient, httpServer))  // connect the device with the IOT platform
    Serial.println("retrying");
  
  //example of how to add an asset directly from code; may be removed but it wasn't because it meant a lot to the developer
  //Device.AddAsset(LIGHTSNSR, "Light_Sensor", "Your friendly neighbourhood light sensor", false, "string");

  while(!Device.Subscribe(pubSub))  // make certain that we can receive message from the iot platform (activate mqtt)
    Serial.println("retrying");
}



/*
 * Functions for GPS
 */

unsigned char getComma(unsigned char num,const char *str)
{
  unsigned char i,j = 0;
  int len=strlen(str);
  for(i = 0;i < len;i ++)
  {
     if(str[i] == ',')
      j++;
     if(j == num)
      return i + 1; 
  }
  return 0; 
}

double getDoubleNumber(const char *s)
{
  char buf[10];
  unsigned char i;
  double rev;
  
  i=getComma(1, s);
  i = i - 1;
  strncpy(buf, s, i);
  buf[i] = 0;
  rev=atof(buf);
  return rev; 
}

/*
 * getDoubleNumber returns the latitude and longitude in this format: 4807.038, 1131.000
 * I need it in this format: 48.07038, 11.31000
 * For that, I created the getDoubleNumber2
 */
 
double getDoubleNumber2(const char *s)
{
  char buf[10];
  unsigned char i;
  double rev;
  
  i=getComma(1, s);
  i = i - 1;
  strncpy(buf, s, i);
  buf[i] = 0;

  for (int j = 0; j < strlen(buf); ++j) {
    if ( (buf[j] == '.') && (j >= 2) ){
        buf[j] = buf[j-1];
        buf[j-1] = buf[j-2];
        buf[j-2] = '.';
    }  
  }
  
  rev=atof(buf);
  return rev; 
}

double getIntNumber(const char *s)
{
  char buf[10];
  unsigned char i;
  double rev;
  
  i=getComma(1, s);
  i = i - 1;
  strncpy(buf, s, i);
  buf[i] = 0;
  rev=atoi(buf);
  return rev; 
}

void parseGPGGA(const char* GPGGAstr)
{
  /* Refer to http://www.gpsinformation.org/dale/nmea.htm#GGA
   * Sample data: $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
   * Where:
   *  GGA          Global Positioning System Fix Data
   *  123519       Fix taken at 12:35:19 UTC
   *  4807.038,N   Latitude 48 deg 07.038' N
   *  01131.000,E  Longitude 11 deg 31.000' E
   *  1            Fix quality: 0 = invalid
   *                            1 = GPS fix (SPS)
   *                            2 = DGPS fix
   *                            3 = PPS fix
   *                            4 = Real Time Kinematic
   *                            5 = Float RTK
   *                            6 = estimated (dead reckoning) (2.3 feature)
   *                            7 = Manual input mode
   *                            8 = Simulation mode
   *  08           Number of satellites being tracked
   *  0.9          Horizontal dilution of position
   *  545.4,M      Altitude, Meters, above mean sea level
   *  46.9,M       Height of geoid (mean sea level) above WGS84
   *                   ellipsoid
   *  (empty field) time in seconds since last DGPS update
   *  (empty field) DGPS station ID number
   *  *47          the checksum data, always begins with *
   */

  int tmp, hour, minute, second, num ;
  if(GPGGAstr[0] == '$')
  {
    tmp = getComma(1, GPGGAstr);
    hour     = (GPGGAstr[tmp + 0] - '0') * 10 + (GPGGAstr[tmp + 1] - '0');
    minute   = (GPGGAstr[tmp + 2] - '0') * 10 + (GPGGAstr[tmp + 3] - '0');
    second    = (GPGGAstr[tmp + 4] - '0') * 10 + (GPGGAstr[tmp + 5] - '0');
    
    //sprintf(buff, "UTC timer %2d-%2d-%2d", hour, minute, second);
    //Serial.println(buff);
    
    tmp = getComma(2, GPGGAstr);
    latitude = getDoubleNumber2(&GPGGAstr[tmp]);
    tmp = getComma(4, GPGGAstr);
    longitude = getDoubleNumber2(&GPGGAstr[tmp]);
    //sprintf(buff, "latitude = %10.4f, longitude = %10.4f", latitude, longitude);
    //Serial.println(buff); 
    
    tmp = getComma(7, GPGGAstr);
    num = getIntNumber(&GPGGAstr[tmp]);    
    //sprintf(buff, "satellites number = %d", num);
    //Serial.println(buff); 
  }
  else
  {
    Serial.println("Not get data"); 
  }
}

/*
 * Functions for Accelerometer
 * 
 */
void initAccelerometer() {

  accelerometer.setActivityThreshold(75); //62.5mg per increment
  accelerometer.setInactivityThreshold(75); //62.5mg per increment
  accelerometer.setTimeInactivity(10); // how many seconds of no activity is inactive?
 
  //look of activity movement on this axes - 1 == on; 0 == off 
  accelerometer.setActivityX(1);
  accelerometer.setActivityY(1);
  accelerometer.setActivityZ(1);
 
  //look of inactivity movement on this axes - 1 == on; 0 == off
  accelerometer.setInactivityX(1);
  accelerometer.setInactivityY(1);
  accelerometer.setInactivityZ(1);
 
  //look of tap movement on this axes - 1 == on; 0 == off
  accelerometer.setTapDetectionOnX(0);
  accelerometer.setTapDetectionOnY(0);
  accelerometer.setTapDetectionOnZ(1);
 
  //set values for what is a tap, and what is a double tap (0-255)
  accelerometer.setTapThreshold(50); //62.5mg per increment
  accelerometer.setTapDuration(15); //625us per increment
  accelerometer.setDoubleTapLatency(80); //1.25ms per increment
  accelerometer.setDoubleTapWindow(200); //1.25ms per increment
 
  //set values for what is considered freefall (0-255)
  accelerometer.setFreeFallThreshold(7); //(5 - 9) recommended - 62.5mg per increment
  accelerometer.setFreeFallDuration(45); //(20 - 70) recommended - 5ms per increment
 
  //setting all interrupts to take place on int pin 1
  //I had issues with int pin 2, was unable to reset it
  accelerometer.setInterruptMapping( ADXL345_INT_SINGLE_TAP_BIT,   ADXL345_INT1_PIN );
  accelerometer.setInterruptMapping( ADXL345_INT_DOUBLE_TAP_BIT,   ADXL345_INT1_PIN );
  accelerometer.setInterruptMapping( ADXL345_INT_FREE_FALL_BIT,    ADXL345_INT1_PIN );
  accelerometer.setInterruptMapping( ADXL345_INT_ACTIVITY_BIT,     ADXL345_INT1_PIN );
  accelerometer.setInterruptMapping( ADXL345_INT_INACTIVITY_BIT,   ADXL345_INT1_PIN );
 
  //register interrupt actions - 1 == on; 0 == off  
  accelerometer.setInterrupt( ADXL345_INT_SINGLE_TAP_BIT, 1);
  accelerometer.setInterrupt( ADXL345_INT_DOUBLE_TAP_BIT, 1);
  accelerometer.setInterrupt( ADXL345_INT_FREE_FALL_BIT,  1);
  accelerometer.setInterrupt( ADXL345_INT_ACTIVITY_BIT,   1);
  accelerometer.setInterrupt( ADXL345_INT_INACTIVITY_BIT, 1);
  
}
