const functions = require("firebase-functions");
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const os = require('os');

const util = require('./util/util.js');
const spotify = require('./services/spotify/routes/spotify_routes.js');



const server = express();

server.use(bodyParser.raw());
server.use(bodyParser.json());

server.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

server.use('/spotify', spotify.router);

server.get('/', (req, res) => {
    res.send('hello');
});


if (util.isLocal) {
    const port = 3000;
    server.listen(port, () => {
        var networkInterfaces = os.networkInterfaces();
        var lanIp = networkInterfaces['Ethernet'][1]['address'];
        console.log(`Server is listening at ${lanIp}:${port}`);
    });
}


exports.app = functions.https.onRequest(server);
