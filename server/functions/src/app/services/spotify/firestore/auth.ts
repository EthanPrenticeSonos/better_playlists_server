/**
 * Manages the Spotify authentication functions and caches for Firestore
 */

import { WriteResult } from "@google-cloud/firestore";
import * as functions from 'firebase-functions';

import { SpotifyAuth } from "../adt/spotify_auth";
import { firestore } from '../../../firebase/firebase_config';
import * as firestoreUsers from './users';

const COLLECTION_NAME = 'spotify_users';


/**
 * If the user's auth object is cached in memory, it's pulled from there.
 * Otherwise, it queries the database, then caches and returns the result.
 * 
 * @param {string} userId 
 * @returns the authentication object associated with the userId
 */
export async function getUserAuth(userId: string): Promise<SpotifyAuth> {
    try {
        let docSnap = await firestore.collection(COLLECTION_NAME).doc(userId).get();
        if (docSnap.exists && docSnap.data()?.auth) {
            functions.logger.debug(
                `Fetched Firestore auth data for Spotify user=${userId}`, 
                docSnap.get('auth')
            );

            let authSnap = docSnap.get('auth');

            if (!authSnap.scopes) {
                return Promise.reject({
                    'status': 502,
                    'error': `Auth field for Spotify user ${userId} does not have a scopes field`
                });
            }

            let authData: SpotifyAuth = {
                'access_token': authSnap!.access_token,
                'refresh_token': authSnap!.refresh_token,
                'expires_at': authSnap!.expires_at.toDate(),
                'scopes': authSnap!.scopes,
                'locked': authSnap!.locked
            };
            
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
        return Promise.reject(e);
    }
};


/**
 * Puts [authObj] in the auth cache and the Firestore document with id [userId]
 * 
 * @param {string} userId 
 * @param {SpotifyAuth} authObj
 * @returns Promise associated with putting [authObj] in Firestore
 */
export async function putUserAuth(userId: string, authObj: SpotifyAuth): Promise<WriteResult> {

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
        return Promise.reject(e);
    }
};

/**
 * Waits for the user's auth object to have a locked value of false
 * 
 * @param {string} userId 
 */
export async function waitOnAuthLocked(userId: string): Promise<void> {
    let doc = firestore.collection(COLLECTION_NAME).doc(userId);

    async function checkAuthLocked(): Promise<boolean> {
        try {
            let docSnap = await doc.get();
            if (docSnap.exists && docSnap.get('locked') !== undefined) {
                if (docSnap.get('locked')) {
                    return Promise.resolve(true);
                }
                else {
                    return Promise.resolve(false);
                }
            }
            else {
                return Promise.reject({
                    'status': 404,
                    'error': "User does not exist"
                });
            }
        }
        catch (e) {
            return Promise.reject(e);
        }
    }

    // try 40 times, waiting 50ms between each
    for (let i = 0; i < 40; ++i) {
        try {
            if (!(await checkAuthLocked())) {
                return;
            }
            else {
                // wait 50ms before checking again
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        catch(e) {
            return Promise.reject(e);
        }
    }

    return Promise.reject({
        'status': 408,
        'error': `Timed out waiting for auth to unlock for Spotify user ${userId}`
    })
}


/**
 * Unlocks the auth object without updating other values
 * Used in-case authentication with Spotify is unsuccessful and no auth object is returned
 * 
 * @param {string} userId 
 */
 export async function unlockAuth(userId: string): Promise<WriteResult> {
    let doc = firestore.collection(COLLECTION_NAME).doc(userId);

    try {
        return await doc.update({
            'auth.locked': false
        });
    }
    catch (e) {
        return Promise.reject(e);
    }
}