import * as functions from 'firebase-functions';
import * as express from 'express';
import * as morgan from 'morgan';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as os from 'os';

const util = require('./util/util');
const spotify = require('./services/spotify/routes/spotify_routes');
const firebaseAuth = require('./firebase/auth')


const app = express();

app.use(bodyParser.raw());
app.use(bodyParser.json());

app.use(cookieParser());
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