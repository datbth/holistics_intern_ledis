var StoreValueObj = require('./storeValueObj')
var fs = require('fs')

const commands = {}

class Command {
    constructor(keyword, numArgs, exactNumArgs, execute){
        this.keyword = keyword
        this.numArgs = numArgs
        this.exactNumArgs = exactNumArgs
        this.dangerouslyExecute = execute
        commands[keyword] = this
    }

    validate(args, store) {
        if (this.exactNumArgs) {
            if (this.numArgs !== args.length){
                throw new Error('Syntax error')
            }
        }
        else if (args.length < this.numArgs){
            throw new Error('Syntax error')
        }
        return null
    }

    execute(args,store) {
        var validationResult = this.validate(args, store)
        return this.dangerouslyExecute(args, store, validationResult)
    }
}

class ListCommand extends Command {
    constructor(keyword, numArgs, exactNumArgs, execute, needValidation){
        super(keyword, numArgs, exactNumArgs, execute)
        this.needValidation = needValidation
    }

    validate(args, store){
        super.validate(args, store)
        if (!this.needValidation) return null
        var storeValueObj = store.get(args[0])
        if (!storeValueObj){
            return []
        }
        else if (storeValueObj.type !== 'list') {
            throw new Error("This key does not hold a list")
        }
        return storeValueObj.value
    }
}

class SetCommand extends Command {
    constructor(keyword, numArgs, exactNumArgs, execute, needValidation){
        super(keyword, numArgs, exactNumArgs, execute)
        this.needValidation = needValidation
    }

    validate(args, store){
        super.validate(args, store)
        if (!this.needValidation) return null
        var storeValueObj = store.get(args[0])
        if (!storeValueObj){
            return []
        }
        else if (storeValueObj.type !== 'set') {
            throw new Error("This key does not hold a set")
        }
        return storeValueObj.value
    }
}

/**
 * set a string value, always overwriting what is saved under key
 */
const setCommand = new Command(
    'set', 2, true,
    function(args, store, validationResult){
        store.set(args[0], new StoreValueObj(args[1], 'string'))
        return "OK"
    }
)

/**
 * get key: get a string value at key already
 */
const getCommand = new Command(
    'get', 1, true,
    function(args, store, validationResult){
        var storeValueObj = store.get(args[0])
        if (!storeValueObj) return null
        if (storeValueObj.type !== 'string'){
            throw new Error("This key does not hold a string")
        }
        return JSON.stringify(storeValueObj.value)
    }
)


/**
 * LLEN key: return length of a list
 */
const llenCommand = new ListCommand(
    'llen', 1, true,
    function (args, store, validationResult){
        var list = validationResult
        return list.length
    },
    true
)

/**
 * RPUSH key value1 [value2...]: append 1 or more values to the list, create list if not exists, return length of list after operation
 */
const rpushCommand = new ListCommand(
    'rpush', 2, false,
    function (args, store, validationResult){
        var storeValueObj = store.get(args[0])
        if (!storeValueObj){
            storeValueObj = new StoreValueObj([], 'list')
        }
        else if (storeValueObj.type !== 'list') {
            throw new Error("This key does not hold a list")
        }
        storeValueObj.value = storeValueObj.value.concat(args.slice(1))
        store.set(args[0], storeValueObj)
        return storeValueObj.value.length
    },
    false
)

/**
 * LPOP key: remove and return  the first item of the list
 */
const lpopCommand = new ListCommand(
    'lpop', 1, true,
    function (args, store, validationResult){
        var list = validationResult
        var firstValue = list.shift()
        return firstValue ? JSON.stringify(firstValue) : null
    },
    true
)

/**
 * RPOP key: remove and return the last item of the list
 */
const rpopCommand = new ListCommand(
    'rpop', 1, true,
    function (args, store, validationResult){
        var list = validationResult
        var lastValue = list.pop()
        return lastValue ? JSON.stringify(lastValue) : null
    },
    true
)

/**
 * LRANGE key start stop: return a range of element from the list (zero-based, inclusive of start and stop), start and stop are non-negative integers
 */
const lrangeCommand = new ListCommand(
    'lrange', 3, true,
    function (args, store, validationResult){
        var list = validationResult
        for (let i = 1; i < 3; i++){
            var index = args[i]
            if (parseFloat(index) !== parseInt(index, 10)){
                throw new Error("Value not an integer")
            }
            args[i] = parseInt(index, 10)
            if (parseInt(index, 10) < 0){
                throw new Error("Value must not be less than 0")
            }
        }
        return JSON.stringify(list.slice(args[1], args[2] + 1))
    },
    true
)

/**
 * SADD key value1 [value2...]: add values to set stored at key
 */
const saddCommand = new SetCommand(
    'sadd', 2, false,
    function(args, store, validationResult) {
        var storeValueObj = store.get(args[0])
        if (!storeValueObj){
            storeValueObj = new StoreValueObj([], 'set')
        }
        else if (storeValueObj.type !== 'set') {
            throw new Error("This key does not hold a set")
        }
        var addedValues = []
        var newValues = args.slice(1).filter(value => {
            if (addedValues.indexOf(value) === -1
                && storeValueObj.value.indexOf(value) === -1){
                addedValues.push(value)
                return true
            }
            return false
        })
        storeValueObj.value = storeValueObj.value.concat(newValues)
        store.set(args[0], storeValueObj)
        return newValues.length
    },
    false
)

/**
 * SCARD key: return the number of elements of the set stored at key
 */
const scardCommand = new SetCommand(
    'scard', 1, true,
    function (args, store, validationResult){
        var set = validationResult
        return set.length
    },
    true
)

/**
 * SMEMBERS key: return array of all members of set
 */
const smembersCommand = new SetCommand(
    'smembers', 1, true,
    function(args, store, validationResult) {
        var set = validationResult
        return JSON.stringify(set)
    },
    true
)

/**
 * SREM key value1 [value2...]: remove values from set
 */
const sremCommand = new SetCommand(
    'srem', 2, false,
    function(args, store, validationResult){
        var set = validationResult
        var numValuesRemoved = 0;
        for (var i = 1; i < args.length; i++){
            var value = args[i]
            var index = set.indexOf(value)
            if (index !== -1){
                set.splice(index, 1)
                numValuesRemoved++
            }
        }
        return numValuesRemoved
    },
    true
)

/**
 * SINTER [key1] [key2] [key3] ...: set intersection among all set stored in specified keys. Return array of members of the result set
 */
const sinterCommand = new SetCommand(
    'sinter', 1, false,
    function(args, store, validationResult){
        var resultSet = []
        for (var i = 0; i < args.length; i++){
            var storeValueObj = store.get(args[i])
            if (!storeValueObj) {
                continue
            }
            if (storeValueObj.type !== 'set'){
                throw new Error("Key " + args[i] + " does not hold a set")
            }
            if (!resultSet.length) {
                resultSet = storeValueObj.value
            }
            else {
                var newValues = storeValueObj.value.filter(value => resultSet.indexOf(value) === -1)
                resultSet = resultSet.concat(newValues)
            }
        }
        return JSON.stringify(resultSet)
    },
    false
)

/**
 * KEYS: List all available keys
 */
const keysCommand = new Command(
    'keys', 0, true,
    function(args, store, validationResult){
        return JSON.stringify(store.keys())
    }
)

/**
 * DEL key: delete a key
 */
const delCommand = new Command(
    'del', 1, true,
    function(args, store, validationResult){
        store.delete(args[0])
        return "OK"
    }
)

/**
 * FLUSHDB: clear all keys
 */
const flushdbCommand = new Command(
    'flushdb', 0, true,
    function(args, store, validationResult){
        var keys = store.keys()
        for (var i = 0 ; i < keys.length; i++){
            store.delete(keys[i])
        }
        return "OK"
    }
)

/**
 * EXPIRE key seconds: set a timeout on a key, seconds is a positive integer. Return the number of seconds if the timeout is set
 */
const expireCommand = new Command(
    'expire', 2, true,
    function(args, store, validationResult){
        var seconds = args[1]
        var storeValueObj = store.get(args[0])
        if (!storeValueObj){
            seconds = 0
        }
        else {
            if (parseFloat(seconds) !== parseInt(seconds,10)
                || parseInt(seconds, 10) <= 0){
                throw new Error("Value must be an integer greater than 0")
            }
            storeValueObj.expire(seconds)
            if (store.expiringKeys.indexOf(args[0]) === -1){
                store.expiringKeys.push(args[0])
            }
        }
        return seconds
    }
)

/**
 * TTL key: query the timeout of a key
 */
const ttlCommand = new Command(
    'ttl', 1, true,
    function(args, store, validationResult){
        var storeValueObj = store.get(args[0])
        if (!storeValueObj){
            return -2
        }
        return parseInt(storeValueObj.ttl, 10)
    }
)

/**
 * SAVE: save current state in a snapshot
 */
const saveCommand = new Command(
    'save', 0, true,
    function(args, store, validationResult){
        try {
            fs.writeFileSync("stores/" + store.name + ".ldb", JSON.stringify(store.data))
        }
        catch(err) {
            console.log(err)
            throw new Error("Could not save state to disk")
        }
        return "OK"
    }
)

/**
 * RESTORE: restore from the last snapshot
 */
const restoreCommand = new Command(
    'restore', 0, false,
    function(args, store, validationResult){
        var replace = false;
        if (args.length > 1){
            throw new Error("Syntax error")
        }
        else if (args.length === 1){
            if (args[0] !== 'REPLACE'){
                throw new Error("Syntax error")
            }
            else {
                replace = true
            }
        }
        var restoringData
        try {
            restoringData = fs.readFileSync("stores/" + store.name + '.ldb', 'utf8')
        }
        catch(err){
            console.log(err)
            throw new Error("Could not read state from disk")
        }
        restoringData = JSON.parse(restoringData)
        store.restore(restoringData, replace)
        return "OK"
    }
)

/**
 * 
 * @param {string} keyword 
 * @param {array(string)} args 
 */
function findCommand(keyword, args){
    var command = commands[keyword]
    if (!command) throw new Error('Command not found')
    return command
}

/**
 * parse a command string to find the appropriate Command and then execute it
 * @param {string} str 
 * @param {object} store the data store
 */
function executeCommandStr(str, store){
    if (!str) throw new Error("Syntax error")
    // parse
    var parts = str.split(" ")
    var keyword = parts[0].toLowerCase()
    var args = []
    if (parts.length > 1) {
        // split the arguments into an array
        var argsStr = parts.slice(1).join(" ") + " "
        var argsRe = /((".*?")|('.*?')|([^ ]+)) /g
        args = argsStr.match(argsRe)
        if (!args) {
            args = []
        }
        else {
            // trim and remove the wrapping "" or '' of each argument
            args = args.map(arg => {
                var argRe = /("(.*)")|('(.*)')/g
                arg = arg.trim()
                var parsedArg = argRe.exec(arg)
                if (parsedArg) {
                    arg = parsedArg[2] || parsedArg[4]
                }
                return arg
            })
        }
    }
    var command = findCommand(keyword, args)
    return command.execute(args, store)
}

module.exports = {
    executeCommandStr: executeCommandStr
}