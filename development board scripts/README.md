# development board scripts

The pbox.ino contains code for flashing on the development board. The development board used was LinkIT One, and the external libraries used in the script are as follows:

PubSubClient and ATT_IOT: https://github.com/allthingstalk/arduino-client/archive/master.zip
Grove_LED_Bar: https://github.com/Seeed-Studio/Grove_LED_Bar.git
ADXL345: http://www.seeedstudio.com/wiki/File:DigitalAccelerometer_ADXL345.zip
DHT: https://github.com/Seeed-Studio/Grove_Starter_Kit_For_LinkIt/tree/master/libraries/Humidity_Temperature_Sensor

The other libraries included in the pbox.ino file are LinkIT specific libraries which can be found in the Arduino IDE under Sketch > Include library > Manage Libraries, or are C native (eg. float.h).