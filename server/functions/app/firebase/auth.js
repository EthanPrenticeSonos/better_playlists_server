const functions = require('firebase-functions');
const admin = require('firebase-admin');

const firestore = require('../util/firebase_config.js').firestore;

const COLLECTION_NAME = 'users';


/**
 * Creates the user document if it does not already exist
 * @param {String} firebaseUserId 
 * @returns Promise from creating the user.  Error if user already exists
 */
function createUserFromFirebaseAuth(firebaseUserId) {
    var doc = firestore.collection(COLLECTION_NAME).doc(firebaseUserId);

    return doc.get().then(docSnap => {
        if (!docSnap.exists) {
            return doc.set({
                'services': {
                    'spotify': null
                }
            }, {merge: true});
            // use merge true - firebase functions can take awhile to trigger when
            //   cold starting.  if we set a service id before the doc exists we want it
            //   to persist
        }
        else {
            return Promise.reject({
                'status': 409,
                'error': 'User already exists'
            })
        }
    })
}


/**
 * Adds the Spotify user ID to the Firebase user's document
 * @param {String} firebaseUserId 
 * @returns Promise from setting the id.
 */
 function addSpotifyUserId(firebaseUserId, spotifyId) {
    var doc = firestore.collection(COLLECTION_NAME).doc(firebaseUserId);

    return doc.set({
            'services': {
                'spotify': spotifyId
            }
        }, {merge: true});
}


/**
 * @param {String} firebaseUserId 
 * @returns Promise with the Spotify account ID associated with the firebase user
 */
function getSpotifyUserId(firebaseUserId) {
    return firestore.collection(COLLECTION_NAME)
        .doc(firebaseUserId)
        .get()
        .then(docSnap => {
            if (docSnap.exists) {
                var spotifyData = docSnap.get('services.spotify');
                if (spotifyData && spotifyData.id) {
                    return spotifyData.id;
                }
                else {
                    return Promise.reject({
                        'status': 404,
                        'error': 'User is not registered for that service'
                    });
                }
            }
            return Promise.reject({
                'status': 404,
                'error': 'User does not exist'
            });
        });
}


// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.headers.user`.
const validateFirebaseIdToken = async (req, res, next) => {
    functions.logger.log('Check if request is authorized with Firebase ID token');
  
    if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
        !(req.cookies && req.cookies.__session)) {
        functions.logger.error(
            'No Firebase ID token was passed as a Bearer token in the Authorization header.',
            'Make sure you authorize your request by providing the following HTTP header:',
            'Authorization: Bearer <Firebase ID Token>',
            'or by passing a "__session" cookie.'
        );
        res.status(403).send('Unauthorized');
        return;
    }
  
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        functions.logger.log('Found "Authorization" header');
        // Read the ID Token from the Authorization header.
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else if(req.cookies) {
        functions.logger.log('Found "__session" cookie');
        // Read the ID Token from cookie.
        idToken = req.cookies.__session;
    } else {
        // No cookie
        res.status(403).send('Unauthorized');
        return;
    }
  
    try {
          const decodedIdToken = await admin.auth().verifyIdToken(idToken);
          functions.logger.log('ID Token correctly decoded', decodedIdToken);
          req.headers.user = decodedIdToken;
          next();
          return;
    } catch (error) {
        functions.logger.error('Error while verifying Firebase ID token:', error);
        res.status(403).send('Unauthorized');
        return;
    }
};

module.exports.createUserFromFirebaseAuth = createUserFromFirebaseAuth;
module.exports.addSpotifyUserId = addSpotifyUserId;
module.exports.getSpotifyUserId = getSpotifyUserId;
module.exports.validateFirebaseIdToken = validateFirebaseIdToken;