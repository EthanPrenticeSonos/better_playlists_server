/**
 * Manages the Spotify user functions and caches for Firestore
 */
import { WriteResult } from "@google-cloud/firestore";
import * as functions from 'firebase-functions';

import { SpotifyAuth } from "../adt/spotify_auth";
import { firestore } from '../../../firebase/firebase_config';

const COLLECTION_NAME = 'spotify_users';


/**
 * 
 * @param {string} userId 
 * @param {SpotifyAuth} authObj 
 * @returns Promise associated with setting the auth object of document [userId]
 *          409 error if resource already exists
 */
export async function createUser(userId: string, authObj: SpotifyAuth): Promise<WriteResult> {
    let doc = firestore
        .collection(COLLECTION_NAME)
        .doc(userId);

    try {
        let docSnap = await doc.get();
        if (!docSnap.exists) {
            return doc.set({
                'auth': authObj,
                // playlists: firestore.collection("playlists").ref
            }, { 'merge': false }).then((res: any) => {
                functions.logger.info(`Created document for Firestore user ${userId}`, authObj);
                return res;
            });
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