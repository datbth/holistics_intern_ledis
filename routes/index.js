var express = require('express');
var router = express.Router();
var middlewares = require('../middlewares')
var commands = require('../commands')

const store = {}

router.use(middlewares.authorize)
router.use(middlewares.rawBody)

// POST endpoint
router.post('/', function(req, res, next) {
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
