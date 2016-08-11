/**
 * BoxController
 *
 * @description :: Server-side logic for managing Boxes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	getBoxById: _getBoxById,
    getPickupForBox: _getPickupForBox
};

function _getBoxById(req, res) {
    
    sails.models.box.findOne({boxId: req.params.boxId}).then(function(result){
        if (result) {
            return res.json(result);
        } else {
            return res.send('No Box with ID ' + req.params.boxId + ' found');
        }
    });
}

function _getPickupForBox(req, res) {
    
    sails.models.box.findOne({boxId: req.params.boxId}).populate('pickupOrder').then(function(result){
        if (result.pickupOrder) {
            return res.json(result.pickupOrder);
        } else {
            return res.send('No Pickup attached to Box with Id ' + req.params.boxId);
        }
    });
}

