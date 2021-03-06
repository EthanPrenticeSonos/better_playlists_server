import * as functions from 'firebase-functions';
import * as express from 'express';
import * as morgan from 'morgan';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

import * as spotifyRoutes from './services/spotify/routes/spotify_routes';
import * as firebaseAuth from './firebase/auth';


export const app = express();

app.use(bodyParser.raw());
app.use(bodyParser.json());

app.use(cookieParser());
app.use(firebaseAuth.validateFirebaseIdToken);

app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

app.use('/spotify', spotifyRoutes.router);

app.get('/', (req, res) => {
    res.send('hello');
});


exports.app = functions.https.onRequest(app);

/*
    TRIGGERS
*/
export const onUserCreate = functions.auth.user().onCreate((user) => {
    return firebaseAuth.createUserFromFirebaseAuth(user.uid);
});


/*
    TIMERS
*/
export const scheduledGraphUpdater = functions.pubsub.schedule('every 3 minutes').onRun((context) => {
    console.log('This will be run every 3 minutes!');
    return null;
});