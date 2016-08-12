/**
 * PickupController
 *
 * @description :: Server-side logic for managing Pickups
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


module.exports = {
	createPickup: _createPickup,
    updateDestination: _updateDestination,
    addBoxToPickup: _addBoxToPickup,
    removeBoxFromPickup: _removeBoxFromPickup
};

function _removeBoxFromPickup(req, res) {
    
    var pickupIdFromReq = req.params.pickupModelId;
    var boxIdFromReq = req.params.boxId;
    
    sails.models.box.update({boxId: boxIdFromReq, pickupOrder: pickupIdFromReq}, {pickupOrder: null}).then(function(result){
        sails.models.pickup.findOne({id: pickupIdFromReq}).then(function(findResult){
            var pboxesIds = findResult.pboxId;
            var localStatus = "READY";
            for (let pboxIt of pboxesIds) {
                if (pboxIt == boxIdFromReq) {
                    pboxesIds.splice(pboxesIds.indexOf(pboxIt), 1);
                    localStatus = "READY";
                    if (pboxesIds.length == 0) {
                        pboxesIds.push("NONE");
                        localStatus = "DRAFT";
                    }
                }
            }
            
            sails.models.pickup.update({id: pickupIdFromReq}, {pboxId: pboxesIds, status: localStatus}).then(function(updated){
                return res.json(updated);
            });
        });
    });
}

function _removeBoxFromPickup_v1(req, res) {
    
    var pickupIdFromReq = req.params.pickupModelId;
    var boxIdFromReq = req.params.boxId;

    sails.models.pickup.findOne({id: pickupIdFromReq}).then(function(findResult){
        var pboxUpdatedIds = findResult.pboxId;
        var boxFoundInPickup = false;
        for (let iterator of pboxUpdatedIds) {
            if (iterator == boxIdFromReq) {
                boxFoundInPickup = true;
            }
        }
        if (boxFoundInPickup) {
            sails.models.box.update({boxId: boxIdFromReq}, {pickupOrder: null}).then(function(updated){
                var localStatus = "READY";
                if (pboxUpdatedIds.length == 1) {
                    pboxUpdatedIds[0] = "NONE";
                    localStatus = "DRAFT";    
                } else {
                    if (pboxUpdatedIds[pboxUpdatedIds.length-1] == boxIdFromReq) {
                        pboxUpdatedIds.pop();
                    } else {
                        pboxUpdatedIds.splice(pboxUpdatedIds.indexOf(boxIdFromReq), 1);    
                    }
                    localStatus = "READY";
                }
                sails.models.pickup.update({id: pickupIdFromReq},{pboxId: pboxUpdatedIds, status: localStatus}).then(function(result){
                    //do nothing
                });
                return res.json(updated);
            });
        } else {
            return res.json();
        }
            
    });
}

function _addBoxToPickup(req, res) {
    
    var pickupIdFromReq = req.params.pickupModelId;
    var boxIdFromReq = req.params.boxId;
    
    sails.models.pickup.findOne({id: pickupIdFromReq}).then(function(findResult){
        
        if (findResult.destinationLatitude == null || findResult.destinationLongitude == null) {
            res.serverError('Invalid opperation. Cannot add Box to a Pickup with no specified destination');
        } else {
            sails.models.box.update({boxId: boxIdFromReq, pickupOrder: null}, {pickupOrder: pickupIdFromReq}).then(function(updated){
                if (updated.length > 0) {
                    var pboxUpdatedIds = findResult.pboxId;
                    if (pboxUpdatedIds[0] == "NONE") {
                        pboxUpdatedIds[0] = boxIdFromReq;
                    } else {
                        pboxUpdatedIds.push(boxIdFromReq);
                    }
                    sails.models.pickup.update({id: pickupIdFromReq}, {status: "READY", pboxId: pboxUpdatedIds}).then(function(result){
                        //do nothing
                    });
                    return res.json(updated);
                } else {
                    return res.json();
                }
            });
        }
    });
    
}

function _createPickup(req, res) {
    
    var pckpLat = req.body.pickupLatitude;
    var pckpLong = req.body.pickupLongitude;
    var pckSize = req.body.packageSize;
    
    sails.models.pickup.create(
    {
        pickupLatitude: pckpLat,
        pickupLongitude: pckpLong,
        packageSize: pckSize,
        pboxId: ["NONE"],
        status: "IDLE"
    }).then(function(result){
        return res.json(result);
    });
    
}

function _updateDestination(req, res) {
    
    var destLat = req.body.destinationLatitude;
    var destLong = req.body.destinationLongitude;
    
    sails.models.pickup.update(
        { id: req.params.pickupModelId },
        {
            destinationLatitude: destLat,
            destinationLongitude: destLong,
            status: "DRAFT"
        }).then(function(result){
            return res.json(result);
        });
}