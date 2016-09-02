angular.module('starter.services', ['ngResource'])

.factory('SailsAPI', function ($http) {
    var PICKUPS = "https://pbox-backend.herokuapp.com/pickup";
    var BOXES = "https://pbox-backend.herokuapp.com/box";
    
    return {
        getPickups: function() {
            return $http.get(PICKUPS);
        },
        getBoxes: function() {
            return $http.get(BOXES);
        },
        getPickupById: function(id) {
            return $http.get(PICKUPS + "/" + id);
        },
        getBoxById: function(id) {
            return $http.get(BOXES + "/" + id);
        },
        postPickup: function(json) {
            return $http.post(PICKUPS, json);
        },
        removePickup: function(id) {
            return $http.delete(PICKUPS + "/" + id);
        },
        postBox: function(json) {
            return $http.post(BOXES, json);
        },
        removeBox: function(id) {
            return $http.delete(BOXES + "/" + id);
        },
        attachBoxToPickup: function(pickupId, boxId) {
            return $http.put(PICKUPS + "/" + pickupId + "/" + boxId, null);
        },
        removeBoxFromPickup: function(pickupId, boxId) {
            return $http.delete(PICKUPS + "/" + pickupId + "/" + boxId);
        }
    }
})

.factory('MqttFilter', function($rootScope) {
    
    var _mqttValues = {};
    
    return {
        filterValues : function(message, box) {
            switch(message.Id) {
                case box.gpsAssetId:
                    _mqttValues[box.boxId][box.gpsAssetId].mqttLat = message.Value.latitude;
                    _mqttValues[box.boxId][box.gpsAssetId].mqttLng = message.Value.longitude;
                    $rootScope.$emit('mqtt-location-update-' + box.boxId, box);
//                    console.log('Latitude: ' + _mqttValues[box.boxId][box.gpsAssetId].mqttLat + ", Longitude: " + _mqttValues[box.boxId][box.gpsAssetId].mqttLng);
                    break;
                case box.temperatureAssetId:
                    _mqttValues[box.boxId][box.temperatureAssetId].mqttTemperature = message.Value;
//                    console.log('Temperature: ' + _mqttValues[box.boxId][box.temperatureAssetId].mqttTemperature);
                    break;
                case box.humidityAssetId:
                    _mqttValues[box.boxId][box.humidityAssetId].mqttHumidity = message.Value;
//                    console.log('Humidity: ' + _mqttValues[box.boxId][box.humidityAssetId].mqttHumidity);
                    break;
                case box.lightAssetId:
                    _mqttValues[box.boxId][box.lightAssetId].mqttLight = message.Value;
//                    console.log('Light: ' + _mqttValues[box.boxId][box.lightAssetId].mqttLight);
                    break;
                case box.accelerometerAssetId:
                    _mqttValues[box.boxId][box.accelerometerAssetId].mqttAcceleration = message.Value;
//                    console.log('Acceleration: ' + _mqttValues[box.boxId][box.accelerometerAssetId].mqttAcceleration);
                    break;
            }
            $rootScope.$apply();
        },
        
        mqttValues: _mqttValues
    }
})

;