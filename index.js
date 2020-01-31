require('dotenv').config();
var express = require('express')
var port = 2222
var app = express()
require('./autobackup')

app.listen(port, function () {
    console.log('Server listening on port ' + port);
})