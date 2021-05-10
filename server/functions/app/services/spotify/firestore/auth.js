/**
 * Manages the Spotify authentication functions and caches for Firestore
 */

const firestore = require('../../../util/firebase_config.js').firestore;

const firestoreUsers = require('./users.js');
const SpotifyAuth = require('../adt/spotify_auth.js');

const COLLECTION_NAME = 'spotify_users';


/**
 * If the user's auth object is cached in memory, it's pulled from there.
 * Otherwise, it queries the database, then caches and returns the result.
 * 
 * @param {String} userId 
 * @returns the authentication object associated with the userId
 */
module.exports.getUserAuth = function(userId) {
    
    if (authCache.userId) { // we have this auth data cached
        return Promise.resolve(authCache[userId]);
    }
    else {
        return firestore.collection(COLLECTION_NAME)
            .doc(userId)
            .get()
            .then(docSnap => {
                if (docSnap.exists && docSnap.data().auth) {
                    console.log(`Cached auth data for Spotify user=${userId} (${JSON.stringify(docSnap.get('auth'))})`);
                    
                    var authData = docSnap.get('auth');

                    authData = new SpotifyAuth(
                        authData.access_token,
                        authData.refresh_token,
                        authData.expires_at,
                        authData.scopes
                    );
                    
                    authCache[userId] = authData;
                    return authData;
                }
                else {
                    return Promise.reject({
                        'status': 404,
                        'error': "User does not exist"
                    });
                }
            });
    }

};


/**
 * Puts [authObj] in the auth cache and the Firestore document with id [userId]
 * 
 * @param {String} userId 
 * @param {SpotifyAuth} authObj
 * @returns Promise associated with putting [authObj] in Firestore
 */
module.exports.putUserAuth = function(userId, authObj) {

    // first cache it
    authCache[userId] = authObj;
    console.log(`Cached auth data for Spotify user=${userId} (${JSON.stringify(authObj)})`);

    // then put it in firestore
    var doc = firestore
        .collection(COLLECTION_NAME)
        .doc(userId);
    
    return doc.get()
        .then(docSnap => {
            if (docSnap.exists) {
                return doc.set({
                    'auth': authObj.toPlain(),
                }, { 'merge': true });
            }
            else {
                return firestoreUsers.createUser(userId, authObj);
            }
        }).catch(error => {
            console.log(`putUserAuth error: ${JSON.stringify(error)}`);
            Promise.reject(error);
        });
};


// use this for caching results for getting user auth
// otherwise we will query firestore each Spotify request to get the access token
var authCache = {}
module.exports.authCache = authCache;