var express = require('express');
var router = express.Router();
var middlewares = require('../middlewares')

const store = {}

router.use(middlewares.authorize)

// POST endpoint
router.post('/', function(req, res, next) {
    var result = "ERROR"
    res.send(result)
});

module.exports = router;
