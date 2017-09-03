var constants = require('./constants')

class Store {
    constructor(name){
        this.data = {}
        this.expiringKeys = []
        this.expirer = this.runActiveExpirer()
        this.checkingKeys = false
        this.name = name
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
            else if (numExpiredKeys / numKeysToCheck <= constants.maxExpiredKeyPercentage){
                this.checkingKeys = false
            }
        }
    }

    checkAndDelExpiredKey(key){
        var storeValueObj = this.data[key]
        if (storeValueObj && storeValueObj.expiredAt > 0) {
            var ttl = (storeValueObj.expiredAt - (new Date()).getTime()) / 1000
            storeValueObj.ttl = ttl
            if (ttl <= 0){
                this.delete(key)
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

    restore(restoringData, shouldReplace) {
        if (shouldReplace){
            Object.assign(this.data, restoringData)
        }
        else {
            var keys = Object.keys(restoringData)
            for (var i = 0; i < keys.length; i++){
                var key = keys[i]
                if (!(key in this.data)){
                    this.set(key, restoringData[key])
                }
            }
        }
    }
}

module.exports = Store