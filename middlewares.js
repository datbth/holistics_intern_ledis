var constants = require('./constants')

/**
 * authorize a request using the custom header param `passwd`
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function authorize(req, res, next){
    if (req.headers.passwd === constants.passwd){
        next();
    }
    res.send("ERROR: unauthorized")
}

module.exports = {
    authorize: authorize
}