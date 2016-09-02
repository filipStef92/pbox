// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova'])

.run(function($ionicPlatform, MqttFilter, $rootScope) {
    
    $rootScope.userType = 'Mortal';
    
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
          cordova.plugins.Keyboard.disableScroll(true);

        }
        if (window.StatusBar) {
          // org.apache.cordova.statusbar required
          StatusBar.styleDefault();
        }
    });
    
    CappMessaging.connect();
    
})



.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })
  
  .state('app.userChooser', {
      url: '/userChooser',
      views: {
        'menuContent': {
          templateUrl: 'templates/userChooser.html',
          controller: 'UserChooserCtrl'
        }
      }
  })
  
  .state('app.pickups', {
      url: '/pickups',
      views: {
        'menuContent': {
          templateUrl: 'templates/pickups.html',
          controller: 'PickupsCtrl'
        }
      }
    })
  
  .state('app.pickup', {
      url: '/pickups/:pickupId',
      views: {
          'menuContent': {
            templateUrl: 'templates/pickup.html',
            controller: 'PickupCtrl'
          }
      }
  })
  
  .state('app.boxes', {
      url: '/boxes',
      views: {
        'menuContent': {
          templateUrl: 'templates/boxes.html',
          controller: 'BoxesCtrl'
        }
      }
    })
  
  .state('app.box', {
      url: '/boxes/:boxId',
      views: {
          'menuContent': {
            templateUrl: 'templates/box.html',
            controller: 'BoxCtrl'
          }
      }
  })
  
  .state('app.about', {
      url: '/about',
      views: {
        'menuContent': {
          templateUrl: 'templates/about.html'
        }
      }
    });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/userChooser');
})

;
