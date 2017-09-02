var request = require('request');
var assert = require('assert')
var tests = require('./tests')
const url = "http://128.199.166.9:3000/"

function sendCommand(commandStr){
    return new Promise (function(resolve, reject){
        request.post({
                headers: {
                    passwd:"BuiThanhDat"
                },
                url: url,
                body: commandStr
            }, function (error, response, body) {
                var result = ""
                if (error) {
                    result = error.message
                }
                else {
                    result = body
                }
                resolve(body)
            }
        );
    })
}

var stdin = process.openStdin();

process.stdout.write(">Ledis: ")
stdin.addListener("data", function (d) {
    var commandStr = d.toString().trim();
    if (commandStr === 'test'){
        var testPromise = Promise.resolve(null)
        var i = 0;
        function testCommand(){
            var test = tests[i]
            return sendCommand(test[0])
                .then(result => {
                    assert.strictEqual(result, test[1])
                    i++
                    console.log(i + " tests passed")
                    if (i < tests.length) return testCommand()
                }).catch(err => {
                    console.error(err)
                })
        }
        testCommand().then(()=>{
            console.log("All passed")
        })
    }
    else {
        sendCommand(commandStr).then(result => {
            console.log(result)
            process.stdout.write("\n>Ledis: ")
        })
    }
});