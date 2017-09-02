var express = require('express');
var router = express.Router();
var middlewares = require('../middlewares')
var commands = require('../commands')

class Store {
    constructor(){
        this.data = {}
    }

    get(key){
        var storeValueObj = this.data[key]
        if (storeValueObj && storeValueObj.expiredAt > 0) {
            var ttl = (storeValueObj.expiredAt - (new Date()).getTime()) / 1000
            ttl = parseInt(ttl, 10)
            if (ttl <= 0){
                delete store[key]
                return undefined
            }

        }
        return storeValueObj
    }

    set(key, value) {
        this.data[key] = value
    }

    keys(){
        return Object.keys(this.data)
    }

    delete(key) {
        delete this.data[key]
    }
}

const store = new Store()

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
