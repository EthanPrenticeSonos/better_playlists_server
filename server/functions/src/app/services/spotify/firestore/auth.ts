/**
 * Manages the Spotify authentication functions and caches for Firestore
 */

import { WriteResult } from "@google-cloud/firestore";
import { SpotifyAuth } from "../adt/spotify_auth";

const firestore = require('../../../firebase/firebase_config').firestore;

const firestoreUsers = require('./users');
const SpotifyAuth = require('../adt/spotify_auth');

const COLLECTION_NAME = 'spotify_users';


/**
 * If the user's auth object is cached in memory, it's pulled from there.
 * Otherwise, it queries the database, then caches and returns the result.
 * 
 * @param {string} userId 
 * @returns the authentication object associated with the userId
 */
module.exports.getUserAuth = async function(userId: string): Promise<SpotifyAuth> {
    
    if (authCache.userId) { // we have this auth data cached
        return authCache[userId];
    }
    else {
        try {
            let docSnap = await firestore.collection(COLLECTION_NAME).doc(userId).get();
            if (docSnap.exists && docSnap.data()?.auth) {
                console.log(`Cached auth data for Spotify user=${userId} (${JSON.stringify(docSnap.get('auth'))})`);
                
                let authSnap = docSnap.get('auth');

                let authData: SpotifyAuth = {
                    'access_token': authSnap!.access_token,
                    'refresh_token': authSnap!.refresh_token,
                    'expires_at': authSnap!.expires_at.toDate(),
                    'scopes': authSnap?.scopes ?? undefined
                };
                
                authCache[userId] = authData;
                return authData;
            }
            else {
                return Promise.reject({
                    'status': 404,
                    'error': "User does not exist"
                });
            }
        }
        catch (e) {
            console.log(`getUserAuth error: ${JSON.stringify(e)}`);
            return Promise.reject(e);
        }
    }
};


/**
 * Puts [authObj] in the auth cache and the Firestore document with id [userId]
 * 
 * @param {string} userId 
 * @param {SpotifyAuth} authObj
 * @returns Promise associated with putting [authObj] in Firestore
 */
module.exports.putUserAuth = async function(userId: string, authObj: SpotifyAuth): Promise<WriteResult> {

    // first cache it
    authCache[userId] = authObj;
    console.log(`Cached auth data for Spotify user=${userId} (${JSON.stringify(authObj)})`);

    // then put it in firestore
    let doc = firestore
        .collection(COLLECTION_NAME)
        .doc(userId);

    try {
        let docSnap = await doc.get();
        if (docSnap.exists) {
            return doc.set({
                'auth': authObj,
            }, { 'merge': true });
        }
        else {
            return firestoreUsers.createUser(userId, authObj);
        }
    }
    catch (e) {
        console.log(`putUserAuth error: ${JSON.stringify(e)}`);
        return Promise.reject(e);
    }
};


interface AuthCache {
    [userId: string]: SpotifyAuth
}

// use this for caching results for getting user auth
// otherwise we will query firestore each Spotify request to get the access token
var authCache: AuthCache = { };
module.exports.authCache = authCache;