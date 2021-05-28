import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { DocumentReference, WriteResult } from '@google-cloud/firestore';

import { firestore } from '../firebase/firebase_config';
import { ResponseError } from '../adt/error/response_error';

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
        let error: ResponseError = {
            status_code: 409,
            error: 'User already exists',
            message_type: 'string',
            message: 'Cannot create a new Firestore document for a user if one has already been created.'
        };
        return Promise.reject(error);
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
                let error: ResponseError = {
                    status_code: 404,
                    error: 'User is not registered for that service (Spotify)',
                    message_type: 'empty',
                    message: null
                };
                return Promise.reject(error);
            }
        }
        else {
            let error: ResponseError = {
                status_code: 500,
                error: 'Firebase user document has not been created',
                message_type: 'string',
                message: `Firebase user (${firebaseUserId}) does not exist in Firestore.  A trigger must not have run successfully.`
            };
            return Promise.reject(error);
        }
    } 
    catch (e) {
        let error: ResponseError = {
            status_code: 500,
            error: 'Unexpected error',
            message_type: typeof(e) === 'string' ? 'string' : 'json',
            message: e
        };
        return Promise.reject(error);
    } 
}


// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.headers.user`.
export async function validateFirebaseIdToken(req: Request, res: Response, next: Function) {
    functions.logger.debug(`Received request with path: ${req.originalUrl}`);
    
    functions.logger.debug('Checking if request is authorized with Firebase ID token');
  
    let authHeader = req.get('authorization');

    if (!(authHeader && authHeader.startsWith('Bearer ')) && !req.cookies?.__session) {
        functions.logger.error(
            'No Firebase ID token was passed as a Bearer token in the Authorization header.',
            'Make sure you authorize your request by providing the following HTTP header:',
            'Authorization: Bearer <Firebase ID Token>',
            'or by passing a "__session" cookie.'
        );

        let resError: ResponseError = {
            status_code: 403,
            error: 'Unauthorized',
            message_type: 'string',
            message: 'No Firebase ID token was included in the Authorization header'
        };

        res.status(resError.status_code).send(resError);
        return;
    }
  
    let idToken: string;
    if (authHeader?.startsWith('Bearer ')) {
        functions.logger.debug('Found "Authorization" header');
        // Read the ID Token from the Authorization header.
        idToken = authHeader.split('Bearer ')[1];
    } else if (req.cookies) {
        functions.logger.debug('Found "__session" cookie');
        // Read the ID Token from cookie.
        idToken = req.cookies.__session;
    } else {
        let resError: ResponseError = {
            status_code: 403,
            error: 'Unauthorized',
            message_type: 'string',
            message: 'Malformed Authorization header'
        };

        res.status(resError.status_code).send(resError);
        return;
    }
  
    try {
          const decodedIdToken = await admin.auth().verifyIdToken(idToken);
          functions.logger.debug('ID Token correctly decoded', decodedIdToken);
          req.headers.user = JSON.stringify(decodedIdToken);
          next();
          return;
    } catch (e) {
        functions.logger.error('Error while verifying Firebase ID token:', e);
        let resError: ResponseError = {
            status_code: 403,
            error: 'Unauthorized',
            message_type: 'string',
            message: 'Error while verifying Firebase ID token.'
        };
        res.status(resError.status_code).send(resError);
        return;
    }
};