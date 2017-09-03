var express = require('express');
var router = express.Router();
var middlewares = require('../middlewares')
var commands = require('../commands')
var Store = require('../store')
var constants = require('../constants')
var fs = require('fs')

const stores = {}

router.use(middlewares.authorize)
router.use(middlewares.rawBody)

// POST endpoint
router.post('/', function(req, res, next) {
    // create directory to save stores
    if (!fs.existsSync(constants.snapshotsPath)) {
        fs.mkdirSync(constants.snapshotsPath);
    }

    // get appropriate store
    var storeName = req.headers.storename || "common"
    var store
    if (storeName in stores){
        store = stores[storeName]
    }
    else {
        store = new Store(storeName)
        stores[storeName] = store
    }

    // process the command
    var result = "ERROR"
    var commandStr = req.rawBody
    if (typeof commandStr === 'string' || commandStr instanceof String) {
        try {
            result = commands.executeCommandStr(req.rawBody, store)
        }
        catch(err) {
            result += ": " + err.message
        }
    }
    else {
        result += ": Invalid data"
    }
    res.send("" + result)
});

module.exports = router;
