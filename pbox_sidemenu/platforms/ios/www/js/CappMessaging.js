(function() {

    var CappMessaging = {};
    var pendingSubscribers = [];
    var pendingSenders = [];

    CappMessaging.clientId = 'daniavram';
    CappMessaging.clientKey = 'tcndvrfznop';
    CappMessaging.brokerUrl = 'https://broker.smartliving.io';
    CappMessaging.brokerPort = 15671;
    CappMessaging.sourceRoot = '/exchange/root/';

    CappMessaging.connect = connect;
    CappMessaging.disconnect = disconnect;
    CappMessaging.subscribe = subscribeToTopic;
    CappMessaging.unsubscribe = unsubscribe;
    CappMessaging.publish = publish;

    ////////////////////////////////////////

    var isConnecting = false;
    var isSubscribed = false;
    var stompClient = null;

    function subscribeToTopic(topic, callback, subscribedCallback) {

        // var topicPattern = 'client.{0}.in.{1}';
        // var topic = topicPattern.format(CappMessaging.clientId, resource);
        var completeTopic = CappMessaging.sourceRoot + topic;
        connectAndSubscribe(completeTopic, callback, subscribedCallback);
    }

    function connectAndSubscribe(topic, callback, onCallbackSubscribed) {

        if (stompClient && stompClient.connected) {
            return subscribe(topic, callback, onCallbackSubscribed);
        }

        pendingSubscribers.push({
            topic: topic,
            callback: callback,
            subscribed: onCallbackSubscribed
        });

        if (!isConnecting) {

            connect();
        }
    }

    function connect(clientId, clientKey, successHandler, failHandler) {

        if (!clientId && !clientKey) {
            clientId = CappMessaging.clientId;
            clientKey = CappMessaging.clientKey;
        } else {
            CappMessaging.clientId = clientId;
            CappMessaging.clientKey = clientKey;
        }

        isConnecting = true;

        var ws = new SockJS(CappMessaging.brokerUrl + ':' + CappMessaging.brokerPort + '/stomp');
        
        stompClient = Stomp.over(ws);
        stompClient.heartbeat.outgoing = 5000;
        stompClient.heartbeat.incoming = 0;

        stompClient.connect(
            clientId,
            clientKey,
            stompConnectionSuccessHandler,
            stompConnectionFailHandler,
            clientId);

        function stompConnectionSuccessHandler(data) {

            isConnecting = false;
            console.log('Stomp connection is succesfull.');

            for (var i = 0; i < pendingSubscribers.length; i++) {
                subscribe(pendingSubscribers[i].topic, pendingSubscribers[i].callback, pendingSubscribers[i].subscribed);
            }

            for (var y = 0; y < pendingSenders.length; y++) {
                stompClient.send(pendingSenders[y].topic, {}, pendingSenders[y].data);
            }

            pendingSubscribers = [];
            pendingSenders = [];

            if (successHandler) {
                successHandler(data);
            }
        }

        function stompConnectionFailHandler(data) {

            isConnecting = false;
            console.log('Stomp connection has failed.');

            if (failHandler) {
                failHandler(data);
            }
        }
    }

    function disconnect(callback) {
        if (stompClient && stompClient.connected) {
            if (callback) {
                stompClient.disconnect(callback);
            } else {
                stompClient.disconnect();
            }
        } else {
            callback();
        }
    }

    function subscribe(topic, callback, subscribedCallback) {

        var sub = stompClient.subscribe(topic, function(message) {

            var destination = message.headers.destination.replace(CappMessaging.sourceRoot, '');

            var messageContent = message.body;
            try {
                messageContent = JSON.parse(message.body);

            } catch (e) {
                //if not possible to parse to JSON, just continute with raw value
            }

            isSubscribed = true;
            callback(messageContent, destination);

        });

        if (subscribedCallback) {
            subscribedCallback(sub);
        }
    }

    function publish(topic, publishData) {

        var completeTopic = CappMessaging.sourceRoot + topic;

        if (stompClient && stompClient.connected) {
            stompClient.send(completeTopic, {}, publishData);
            return;
        }

        pendingSenders.push({
            topic: completeTopic,
            data: publishData
        });

        if (!isConnecting) {
            connect();
        }
    }

    function unsubscribe(sub) {
        if (sub) {
            isSubscribed = false;
            sub.unsubscribe();
        }
    }

    window.CappMessaging = CappMessaging;

})();