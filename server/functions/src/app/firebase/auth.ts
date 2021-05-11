import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { DocumentReference, WriteResult } from '@google-cloud/firestore';

import { firestore } from '../firebase/firebase_config';

const COLLECTION_NAME = 'users';


/**
 * Creates the user document if it does not already exist
 * @param {string} firebaseUserId 
 * @returns Promise from creating the user.  Error if user already exists
 */
export async function createUserFromFirebaseAuth(firebaseUserId: string): Promise<WriteResult> {
    let doc: DocumentReference = firestore.collection(COLLECTION_NAME).doc(firebaseUserId);

    const docSnap = await doc.get();
    if (!docSnap.exists) {
        return await doc.set({
            'services': {
                'spotify': null
            }
        }, { merge: true });
        // use merge true - firebase functions can take awhile to trigger when
        //   cold starting.  if we set a service id before the doc exists we want it
        //   to persist
    }
    else {
        return Promise.reject({
            'status': 409,
            'error': 'User already exists'
        });
    }
}


/**
 * Adds the Spotify user ID to the Firebase user's document
 * @param {string} firebaseUserId 
 * @returns Promise from setting the id.
 */
 export function addSpotifyUserId(firebaseUserId: string, spotifyId: string): Promise<WriteResult> {
    let doc = firestore.collection(COLLECTION_NAME).doc(firebaseUserId);

    return doc.set({
            'services': {
                'spotify': {
                    'id': spotifyId
                }
            }
        }, {merge: true});
}


/**
 * @param {String} firebaseUserId 
 * @returns Promise with the Spotify account ID associated with the firebase user
 */
export async function getSpotifyUserId(firebaseUserId: string): Promise<string> {
    try {
        let docSnap = await firestore.collection(COLLECTION_NAME).doc(firebaseUserId).get();
        if (docSnap.exists) {
            let spotifyData = docSnap.get('services.spotify');
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
        else {
            return Promise.reject({
                'status': 404,
                'error': 'User does not exist'
            });
        }
    } 
    catch (e) {
        return Promise.reject(e);
    } 
}


// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.headers.user`.
export async function validateFirebaseIdToken(req: Request, res: Response, next: Function) {
    functions.logger.log('Check if request is authorized with Firebase ID token');
  
    let authHeader = req.get('authorization');

    functions.logger.debug('Received authorization header: ', authHeader);

    if (!(authHeader && authHeader.startsWith('Bearer ')) && !req.cookies?.__session) {
        functions.logger.error(
            'No Firebase ID token was passed as a Bearer token in the Authorization header.',
            'Make sure you authorize your request by providing the following HTTP header:',
            'Authorization: Bearer <Firebase ID Token>',
            'or by passing a "__session" cookie.'
        );
        res.status(403).send('Unauthorized');
        return;
    }
  
    let idToken: string;
    if (authHeader?.startsWith('Bearer ')) {
        functions.logger.log('Found "Authorization" header');
        // Read the ID Token from the Authorization header.
        idToken = authHeader.split('Bearer ')[1];
    } else if (req.cookies) {
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
          req.headers.user = JSON.stringify(decodedIdToken);
          next();
          return;
    } catch (error) {
        functions.logger.error('Error while verifying Firebase ID token:', error);
        res.status(403).send('Unauthorized');
        return;
    }
};