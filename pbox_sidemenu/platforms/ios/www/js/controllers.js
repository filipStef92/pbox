angular.module('starter.controllers', ['starter.services', 'ionic', 'ngTouch', 'google.places', 'starter.directives'])


.controller('AppCtrl', function($scope, $ionicModal, $timeout, $rootScope) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Form data for the login modal
    
  

})

.controller('UserChooserCtrl', function($scope, $rootScope) {
    $scope.chooseUser = function(userType) {
        $rootScope.userType = userType;
    };
})

.controller('PickupsCtrl', function($scope, $ionicModal, SailsAPI, $cordovaGeolocation, $http, MqttFilter) {
    SailsAPI.getPickups().then(function(results) {
        $scope.pickups = results.data;
        $scope.$broadcast('pickups-received', null);
    });
    $scope.gPlace;
    
    $scope.$on('pickups-received', function (event, value) {
        subscribeToAllBoxes();
    });    
    
    var geocoder = new google.maps.Geocoder;
    var geocoderOptions = {timeout: 10000, enableHighAccuracy: true, language: 'en'};
    var currentLocation = {'address': null, 'lat': null, 'lng': null};
    var addressBuffer = {'address': null, 'lat': null, 'lng': null};
    
    $scope.openAddPickupModal = function() {
        $ionicModal.fromTemplateUrl('templates/addPickupModal.html', {
            scope: $scope,
            animation: 'slide-in-up',
        }).then(function(modal) {
            $scope.addPickupModal = modal;
            $scope.pickupData = {
                pickupAddress: null,
                pickupAddressLatitude: null,
                pickupAddressLongitude: null,
                pickupDestination: null,
                pickupDestinationLatitude: null,
                pickupDestinationLongitude: null,
                boxSize: null
            };

            modal.show();
            
            $cordovaGeolocation.getCurrentPosition(geocoderOptions).then(function(position) {
                var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);            
                geocoder.geocode({'location': latLng.toJSON()}, function(results, status) {
                    if (status === 'OK') {
                        if (results[1]) {
                            currentLocation.address = results[1].formatted_address;
                        } else {
                            console.log('No results found');
                        }
                    } else {
                        console.log('Geocoder failed due to: ' + status);
                    }
                });
                currentLocation.lat = position.coords.latitude;
                currentLocation.lng = position.coords.longitude;
            }, function(error) {
                console.log("Current location not available");
            });
        });
    };
    
    function subscribeToAllBoxes() {
        for (pickupsIt of $scope.pickups) {
            for (boxesIt of pickupsIt.boxes) {
                if (MqttFilter.mqttValues[boxesIt.boxId]) {
                    //do nothing
                } else {
                    var builder = {};
                    builder[boxesIt.gpsAssetId] = {mqttLat: 0.0, mqttLng: 0.0};
                    builder[boxesIt.temperatureAssetId] = {mqttTemperature: 0.0};
                    builder[boxesIt.humidityAssetId] = {mqttHumidity: 0.0};
                    builder[boxesIt.lightAssetId] = {mqttLight: 0.0};
                    builder[boxesIt.accelerometerAssetId] = {mqttAcceleration: 0.0};
                    
                    MqttFilter.mqttValues[boxesIt.boxId] = builder;
                    
                    subscribeToBox(boxesIt);
                }
            }
        }
        console.log(MqttFilter.mqttValues);
    };
    
    function subscribeToBox(box) {
        CappMessaging.subscribe(
            'client.daniavram.in.device.' + box.boxId + '.#',
            function(callbackMessage) {
                MqttFilter.filterValues(callbackMessage, box);
            }
        );
    }
	
    $scope.closeAddPickupModal = function() {
        $scope.addPickupModal.remove();
    };
	
    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.addPickupModal.remove();
    });
    
    $scope.$on('g-places-autocomplete:select', function(event, location) {
        addressBuffer.address = location.formatted_address;
        addressBuffer.lat = location.geometry.location.lat();
        addressBuffer.lng = location.geometry.location.lng();
    });
    
    $scope.addressLabelChanged = function(elementId) {
        if (elementId == 'pickupAddress') {
            $scope.pickupData.pickupAddress = addressBuffer.address;
            $scope.pickupData.pickupAddressLatitude = addressBuffer.lat;
            $scope.pickupData.pickupAddressLongitude = addressBuffer.lng;
        }
        
        if (elementId == 'pickupDestination') {
            $scope.pickupData.pickupDestination = addressBuffer.address;
            $scope.pickupData.pickupDestinationLatitude = addressBuffer.lat;
            $scope.pickupData.pickupDestinationLongitude = addressBuffer.lng;
        }
    }
    
    $scope.addPickup = function() {
        if (    $scope.pickupData.boxSize &&
                $scope.pickupData.pickupAddress &&
                $scope.pickupData.pickupAddressLatitude &&
                $scope.pickupData.pickupAddressLongitude &&
                $scope.pickupData.pickupDestination &&
                $scope.pickupData.pickupDestinationLatitude &&
                $scope.pickupData.pickupDestinationLongitude
           ) {
            var tempPickup = 
                {
                    pickupLatitude: $scope.pickupData.pickupAddressLatitude,
                    pickupLongitude: $scope.pickupData.pickupAddressLongitude,
                    pickupAddress: $scope.pickupData.pickupAddress,
                    packageSize: $scope.pickupData.boxSize,
                    destinationLatitude: $scope.pickupData.pickupDestinationLatitude,
                    destinationLongitude: $scope.pickupData.pickupDestinationLongitude,
                    destinationAddress: $scope.pickupData.pickupDestination
                };

            SailsAPI.postPickup(tempPickup).then(
                function(successParam) {
                    //dance the rumba!
                    SailsAPI.getPickups().then(function(results) {
                        $scope.pickups = results.data;
                    });
                },
                function(failureParam) {
                    //cry in a corner
                    console.log('Error while posting in Pickups');
                }
            );
            $scope.addPickupModal.remove();
        }
    };
    
    $scope.putCurrentLocation = function(param) {
        if (param == "InPickup") {
            $scope.pickupData.pickupAddress = currentLocation.address;
            $scope.pickupData.pickupAddressLatitude = currentLocation.lat;
            $scope.pickupData.pickupAddressLongitude = currentLocation.lng;
        } else if (param == "InDestination") {
            $scope.pickupData.pickupDestination = currentLocation.address;
            $scope.pickupData.pickupDestinationLatitude = currentLocation.lat;
            $scope.pickupData.pickupDestinationLongitude = currentLocation.lng;
        }
    };
    
    $scope.removeItem = function(itemId) {
        SailsAPI.removePickup(itemId).then(
            function(successParam) {
                //nobody cares when everything goes smoothly
                if (typeof successParam.data === 'object') {
                    SailsAPI.getPickups().then(function(results) {
                        $scope.pickups = results.data;
                    });
                } else if (typeof successParam.data === 'string') {
                    alert(successParam.data);
                }
            },
            function(failureParam) {
                //cry some more in a different corner
                console.log('Error while deleting Pickup');
            }
        );
    };
    
    $scope.reportEvent = function (event) {
        console.log('Reporting : ' + event.type);
        event.preventDefault();
    };
    
    $scope.refreshPickups = function(event) {
        SailsAPI.getPickups()
            .then(function(results) {
                $scope.pickups = results.data;
                $scope.$broadcast('pickups-received', null);
            })
            .finally(function() {
                // Stop the ion-refresher from spinning
                $scope.$broadcast('scroll.refreshComplete');
            });
    };
})

.controller('PickupCtrl', function($scope, $stateParams, SailsAPI, $ionicModal, $state, $timeout, MqttFilter, $rootScope) {
    
    $scope.userType = $rootScope.userType;
    
    SailsAPI.getPickupById($stateParams.pickupId).then(function(result) {
        $scope.pickup = result.data;
    });
    
    $scope.removeBoxFromPickup = function(boxIdParam) {
        SailsAPI.removeBoxFromPickup($scope.pickup.id, boxIdParam).then(
            function(successParam) {
                //In brightest day or blackest night, no evil shall escape my sight
                if (typeof successParam.data === 'object') {
                    $scope.pickup = successParam.data;
                    delete MqttFilter.mqttValues[boxIdParam];
                    console.log(MqttFilter.mqttValues);
                } else if (typeof successParam.data === 'string') {
                    alert(successParam.data);
                }
            },
            function(failureParam) {
                console.log(failureParam);
            }
        );
    };
    
    $scope.openAttachNewBoxModal = function() {
        $ionicModal.fromTemplateUrl('templates/attachNewBoxModal.html', {
            scope: $scope,
            animation: 'slide-in-up',
        }).then(function(modal) {
            $scope.attachNewBoxModal = modal;
            modal.show();
        });
    };
    
    $scope.closeAttachNewBoxModal = function() {
        $scope.attachNewBoxModal.remove();
    };
    
    $scope.attachBox = function(boxIdParam) {
        SailsAPI.attachBoxToPickup($scope.pickup.id, boxIdParam).then(
            function(successParam) {
                //this one's for that ice-cold Michelle Pfeiffer, that white gold
                if (typeof successParam.data === 'object') {
                    $scope.pickup = successParam.data;
                } else {
                    alert(successParam.data);
                }
                $scope.closeAttachNewBoxModal();
            },
            function(failureParam){
                alert('Box not added to Pickup');
            }
        );
    };
})

.controller('BoxesCtrl', function($scope, $ionicModal, SailsAPI) {
    SailsAPI.getBoxes().then(function(results) {
        $scope.boxes = results.data;
    });

    $scope.openAddBoxModal = function() {
        $ionicModal.fromTemplateUrl('templates/addBoxModal.html', {
            scope: $scope,
            animation: 'slide-in-up',
        }).then(function(modal) {
            $scope.addBoxModal = modal;
            modal.show();
        });
    };
	
    $scope.closeAddBoxModal = function() {
        $scope.addBoxModal.remove();
    };
	
    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.addBoxModal.remove();
    });
    
    $scope.addBox = function(boxParam) {
        if (boxParam.boxIdParam &&
            boxParam.gpsAssetId &&
            boxParam.tempAssetId &&
            boxParam.humidAssetId &&
            boxParam.lightAssetId &&
            boxParam.accelAssetId
           ) 
        {
            
            var tempBox = 
            {
                boxId: boxParam.boxIdParam,
                gpsAssetId: boxParam.gpsAssetId,
                temperatureAssetId: boxParam.tempAssetId,
                humidityAssetId: boxParam.humidAssetId,
                lightAssetId: boxParam.lightAssetId,
                accelerometerAssetId: boxParam.accelAssetId,
                isBeingDelivered: false
            };
            
            SailsAPI.postBox(tempBox).then(
                function(successParam) {
                    //everybody likes a successful... something
                    $scope.refreshBoxes();
                },
                function(failureParam) {
                    // #suicide
                }
            );
            
            $scope.addBoxModal.remove();
        } else {
            console.log('Box not created. Not all fields are filled in');
        }
    };
    
    $scope.removeItem = function(itemId) {
        SailsAPI.removeBox(itemId).then(function(successParam) {
            if (typeof successParam.data === 'string') {
                alert(successParam.data);
            } else {
                SailsAPI.getBoxes().then(function(results) {
                    $scope.boxes = results.data;
                });
            }
        });
    };
    
    $scope.reportEvent = function (event) {
        console.log('Reporting : ' + event.type);
        event.preventDefault();
    };
    
    $scope.refreshBoxes = function() {
        SailsAPI.getBoxes()
            .then(function(results) {
                $scope.boxes = results.data;
            })
            .finally(function() {
                // Stop the ion-refresher from spinning
                $scope.$broadcast('scroll.refreshComplete');
            });
    };
    
})

.controller('BoxCtrl', function($scope, $stateParams, SailsAPI, $cordovaGeolocation, MqttFilter, $rootScope) {
    
    SailsAPI.getBoxById($stateParams.boxId).then(function(result) {
        $scope.box = result.data;
        $scope.$broadcast('box-received', $scope.box);
    });
    
    var marker = null;
    
    $scope.$on('box-received', function(event, box) {
        
        $scope.mqttValues = MqttFilter.mqttValues;
        var lat = 0.0;
        var lng = 0.0;
        
        if ($scope.mqttValues[box.boxId] && $scope.mqttValues[box.boxId][box.gpsAssetId].mqttLat && $scope.mqttValues[box.boxId][box.gpsAssetId].mqttLng) {
            lat = $scope.mqttValues[box.boxId][box.gpsAssetId].mqttLat;
            lng = $scope.mqttValues[box.boxId][box.gpsAssetId].mqttLng;
        }

        var latLng = new google.maps.LatLng(lat, lng);
        marker = new google.maps.Marker({
            map: $scope.map,
            animation: google.maps.Animation.DROP,
            position: latLng
        });

        var mapOptions = {
            center: latLng,
            zoom: 18,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
        google.maps.event.addListenerOnce($scope.map, 'idle', function(){
            marker = new google.maps.Marker({
                map: $scope.map,
                animation: google.maps.Animation.DROP,
                position: latLng
            });
        });
        $scope.map.setCenter(marker.getPosition());
        $scope.map.setZoom(9);
    });
        
    
    $rootScope.$on('mqtt-location-update-' + $stateParams.boxId, function(event, box) {
        latLng = new google.maps.LatLng($scope.mqttValues[box.boxId][box.gpsAssetId].mqttLat, $scope.mqttValues[box.boxId][box.gpsAssetId].mqttLng);
        marker.setMap(null);
        marker = new google.maps.Marker({
            map: $scope.map,
            animation: google.maps.Animation.DROP,
            position: latLng
        });
        $scope.map.setCenter(marker.getPosition());
        $scope.map.setZoom(9);
    });
})
;