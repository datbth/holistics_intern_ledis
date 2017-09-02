var express = require('express');
var router = express.Router();
var middlewares = require('../middlewares')
var commands = require('../commands')
var constants = require('../constants')

class Store {
    constructor(){
        this.data = {}
        this.expiringKeys = []
        this.expirer = this.runActiveExpirer()
        this.checkingKeys = false
    }

    runActiveExpirer(){
        return setInterval(()=>{
            this.checkExpiringKeys()
        }, constants.activeExpirerInterval)
    }

    checkExpiringKeys(){
        if (this.checkingKeys) return
        this.checkingKeys = true
        while(this.checkingKeys){
            var numKeysToCheck = Math.min(constants.numKeysToCheckPerInterval, this.expiringKeys.length)
            var numExpiredKeys = 0
            for (var i = 0; i < numKeysToCheck; i++){
                var index = Math.floor(Math.random() * this.expiringKeys.length)
                var key = this.expiringKeys[i]
                var expired = this.checkAndDelExpiredKey(key)
                if (expired) {
                    numExpiredKeys++
                }
            }
            if (!this.expiringKeys.length){
                this.checkingKeys = false
            }
            else if (numExpiredKeys / numKeysToCheck <= (1 - constants.maxExpiredKeyPercentage)){
                this.checkingKeys = false
            }
        }
    }

    checkAndDelExpiredKey(key){
        var storeValueObj = this.data[key]
        if (storeValueObj && storeValueObj.expiredAt > 0) {
            var ttl = (storeValueObj.expiredAt - (new Date()).getTime()) / 1000
            if (ttl <= 0){
                delete store[key]
                this.expiringKeys.splice(this.expiringKeys.indexOf(key), 1)
                return true
            }
        }
        return false
    }

    get(key){
        var storeValueObj = this.data[key]
        var expired = this.checkAndDelExpiredKey(key)
        if (expired) return undefined
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
