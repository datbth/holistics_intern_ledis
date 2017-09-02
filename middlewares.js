var constants = require('./constants')

/**
 * authorize a request using the custom header param `passwd`
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function authorize(req, res, next) {
    if (req.headers.passwd === constants.passwd) {
        next();
    }
    else {
        res.send("ERROR: unauthorized")
    }
}

/**
 * get the body of the request as plain text
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function rawBody(req, res, next) {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function (chunk) {
        req.rawBody += chunk;
    });
    req.on('end', function () {
        next();
    });
}

module.exports = {
    authorize: authorize,
    rawBody: rawBody
}