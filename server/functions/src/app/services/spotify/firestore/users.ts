/**
 * Manages the Spotify user functions and caches for Firestore
 */

import { WriteResult } from "@google-cloud/firestore";
import { SpotifyAuth } from "../adt/spotify_auth";

const firestore = require('../../../firebase/firebase_config').firestore;
const COLLECTION_NAME = 'spotify_users';


/**
 * 
 * @param {string} userId 
 * @param {SpotifyAuth} authObj 
 * @returns Promise associated with setting the auth object of document [userId]
 *          409 error if resource already exists
 */
module.exports.createUser = async function(userId: string, authObj: SpotifyAuth): Promise<WriteResult> {
    let doc = firestore
        .collection(COLLECTION_NAME)
        .doc(userId);

    try {
        let docSnap = await doc.get();
        if (!docSnap.exists) {
            return doc.set({
                'auth': authObj,
                // playlists: firestore.collection("playlists").ref
            }, { 'merge': false });
        }
        else {
            return Promise.reject({
                'status': 409,
                'message': "Resource already exists"
            });
        }
    }
    catch (e) {
        return Promise.reject(e);
    }
};