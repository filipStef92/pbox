/**
 * PickupController
 *
 * @description :: Server-side logic for managing Pickups
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


module.exports = {
	removeBoxFromPickup : _removeBoxFromPickup,
    addBoxToPickup: _addBoxToPickup
};

function _removeBoxFromPickup(req, res) {

    sails.models.box.findOne({boxId: req.params.boxId}).exec(function (err, result){
          if (err) {
            return res.serverError(err);
          }

          if (!result) {
            return res.notFound('Could not find box with ID ' + req.params.boxId);
          } else {
            sails.models.box.update({boxId: req.params.boxId, pickupOrder : result.pickupOrder}, {boxId: req.params.boxId, pickupOrder : null}).exec(function afterwards(err, updated){
                if (err) {
                    res.serverError(err);
                }
                return res.send('Box with ID ' + req.params.boxId + ' deleted from Pickup with ID ' + req.params.pickupModelId);
            });
          }
    });
}

function _addBoxToPickup(req, res) {
    
    sails.models.box.update({boxId : req.params.boxId, pickupOrder: null}, {pickupOrder : req.params.pickupModelId}).exec(function afterwards(err, updated){
        if (err) {
            res.serverError(err);
        }
        if (updated.length > 0) {
            return res.send('Box with ID ' + req.params.boxId + ' added to Pickup with ID ' + req.params.pickupModelId);
        } else {
            return res.send('No Box added to Pickup with ID '+req.params.pickupModelId);
        }
    });
}