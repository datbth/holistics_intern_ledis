var request = require('request');
const url = "http://128.199.166.9:3000/"

function sendCommand(commandStr, completeHandler){
    request.post({
            headers: {
                passwd:"BuiThanhDat"
            },
            url: url,
            body: commandStr
        }, function (error, response, body) {
            if (error) {
                console.log(error.message)
            }
            else {
                console.log(body); 
            }
            completeHandler()
        }
    );
}

var stdin = process.openStdin();

process.stdout.write(">Ledis: ")
stdin.addListener("data", function (d) {
    var commandStr = d.toString().trim();
    sendCommand(commandStr, function(){
        process.stdout.write("\n>Ledis: ")
    })
});