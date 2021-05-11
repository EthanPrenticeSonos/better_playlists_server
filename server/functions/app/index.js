const functions = require("firebase-functions");
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')();
const os = require('os');

const util = require('./util/util.js');
const spotify = require('./services/spotify/routes/spotify_routes.js');
const firebaseAuth = require('./firebase/auth.js')


const app = express();

app.use(bodyParser.raw());
app.use(bodyParser.json());

app.use(cookieParser);
app.use(firebaseAuth.validateFirebaseIdToken);

app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

app.use('/spotify', spotify.router);

app.get('/', (req, res) => {
    res.send('hello');
});


if (util.isLocal) {
    const port = 3000;
    app.listen(port, () => {
        var networkInterfaces = os.networkInterfaces();
        var lanIp = networkInterfaces['Ethernet'][1]['address'];
        console.log(`Server is listening at ${lanIp}:${port}`);
    });
}


exports.app = functions.https.onRequest(app);


/*
    TRIGGERS
*/
exports.onUserCreate = functions.auth.user().onCreate((user) => {
    return firebaseAuth.createUserFromFirebaseAuth(user.uid);
});