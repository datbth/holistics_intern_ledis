const commands = {}

class Command {
    constructor(keyword, numArgs, excecute){
        this.keyword = keyword
        this.numArgs = numArgs
        this.excecute = excecute
        commands[keyword] = this
    }
}

/**
 * set a string value, always overwriting what is saved under key
 */
const setCommand = new Command(
    'set',
    2,
    function(args, store){
        store[args[0]] = args[1]
        return "OK"
    }
)

/**
 * get key: get a string value at key already
 */
const getCommand = new Command(
    'get',
    1,
    function(args, store){
        return '"' + store[args[0]] + '"'
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
    if (command.numArgs !== args.length) throw new Error('Syntax error')
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
    return command.excecute(args, store)
}

module.exports = {
    executeCommandStr: executeCommandStr
}