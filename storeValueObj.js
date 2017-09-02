class StoreValueObj {
    constructor(value, type){
        this.value = value
        this.type = type
        this.createdAt = new Date()
        this.expiredAt = 0
    }
}

module.exports = StoreValueObj