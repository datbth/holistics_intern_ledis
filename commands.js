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
        var list = store[args[0]]
        if (!list){
            throw new Error("Key not found")
        }
        else if (list.constructor !== Array) {
            throw new Error("This key does not hold a list")
        }
        return list
    }
}

/**
 * set a string value, always overwriting what is saved under key
 */
const setCommand = new Command(
    'set', 2, true,
    function(args, store, validationResult){
        store[args[0]] = args[1]
        return "OK"
    }
)

/**
 * get key: get a string value at key already
 */
const getCommand = new Command(
    'get', 1, true,
    function(args, store, validationResult){
        if (!(args[0] in store)){
            return null
        }
        return JSON.stringify(store[args[0]])
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
    'rpush', 3, false,
    function (args, store, validationResult){
        var list = store[args[0]]
        if (!list){
            list = []
        }
        else if (list.constructor !== Array) {
            throw new Error("This key does not hold a list")
        }
        list = list.concat(args.slice(1))
        store[args[0]] = list
        return list.length
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