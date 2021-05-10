/**
 * Manages the Spotify user functions and caches for Firestore
 */

const firestore = require('../../../util/firebase_config.js').firestore;
const COLLECTION_NAME = 'spotify_users';


/**
 * 
 * @param {String} userId 
 * @param {SpotifyAuth} authObj 
 * @returns Promise associated with setting the auth object of document [userId]
 *          409 error if resource already exists
 */
module.exports.createUser = (userId, authObj) => {
    var doc = firestore
        .collection(COLLECTION_NAME)
        .doc(userId);

    return doc.get()
        .then(docSnap => {
            if (!docSnap.exists) {
                return doc.set({
                    'auth': authObj.toPlain(),
                    // playlists: firestore.collection("playlists").ref
                }, { 'merge': false });
            }
            else {
                return Promise.reject({
                    'status': 409,
                    'message': "Resource already exists"
                });
            }
        })
};