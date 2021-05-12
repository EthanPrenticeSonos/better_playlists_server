import * as express from 'express';
import * as url from 'url';
import * as functions from 'firebase-functions';
import axios from 'axios';
import { SpotifyAuth } from '../adt/spotify_auth';
import { SpotifyUserAuth } from '../adt/spotify_user_auth';

import * as util from '../../../util/util';
import { Headers } from '../../../adt/headers';
import * as authFirebase from '../../../firebase/auth';
import * as spotifyFirestore from '../firestore/spotify_firestore';
import * as spotifyUsers from './users';


const SPOTIFY_CLIENT_ID = "79cde8abd53b43058474f611783fdf9b";

const REQUIRED_SCOPES = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public"
];


/**
 * Checks whether the Spotify user is authenticated with Spotify
 * @param {Headers} headers 
 * @returns whether the Spotify user is authenticated with Spotify
 */
async function isAuthenticated(headers: Headers): Promise<boolean> {
    // test if we can get the user
    let spotifyUrl = new url.URL('https://api.spotify.com/v1/me');

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        // if request is successful, we are authenticated with Spotify
        await axios.get(spotifyUrl.href, {
            'headers': headers
        });

        return true;
    }
    catch (e) {
        if (e.response) {
            if (e.response?.status === 401) {
                return false;
            }
            if (e.response?.status === 400 && e.response?.data?.error === 'invalid_grant') {
                return false;
            }
            else {
                return Promise.reject(e);
            }
        }
        else {
            if (e.status === 404 && e.error === "User does not exist") {
                return false;
            }
            else {
                return Promise.reject(e);
            }
        }
    }
}


/**
 * Authorizes the user with Spotify by redirecting them to Spotify's authorization page
 * @param {Request} req 
 * @param {Response} res 
 * @returns an authorization code to the redirectUri specified in [res.query]
 */
function authorize(req: express.Request, res: express.Response) {
    // forward to Spotify service
    let redirectUrl = new url.URL("https://accounts.spotify.com/authorize");
    
    // @ts-ignore
    let params = new URLSearchParams(req.query);

    params.append('client_id', SPOTIFY_CLIENT_ID);
    params.append('scope', REQUIRED_SCOPES.join(' '));
    params.append('response_type', 'code');
    redirectUrl.search = params.toString();

    functions.logger.debug(`Authorize params: ${params.toString()}`);
    
    res.redirect(307, redirectUrl.href);
}


/**
 * Authenticates the user using the given grant_type (authorization_code or refresh_token)
 * The [SpotifyAuth] object is then cached and stored in Firestore
 * @param {Request} req 
 * @param {Response} res 
 * @returns the user id associated with the Spotify user that was authenticated
 */
async function authenticate(req: express.Request, res: express.Response) {
    var grantType = req.body.grant_type;

    var authPromise = null;

    if (grantType === 'authorization_code') {
        authPromise = authenticateCode(
            req.body.code,
            req.body.redirect_uri,
            req.body.code_verifier
        );
    }
    else {
        res.status(400);
        res.send({
            'error': 'invalid_grant_type',
            'error_description': 'only accepts \'code\' grant type from clients.  refresh managed internally.'
        });
        return;
    }

    try {
        let authResponse = await authPromise;
        
        let firebaseUserId = JSON.parse(req.get('user')!).uid;
        let spotifyUserId = authResponse.user_id;

        if (firebaseUserId === spotifyUserId) {           
            res.status(409).send({
                'error': 'User already associated with another Spotify account!'
            })
        }
        else {
            functions.logger.log(`Firebase user \'${firebaseUserId}\' registered with Spotify account ${spotifyUserId}`);
            
            await authFirebase.addSpotifyUserId(firebaseUserId, spotifyUserId);
            res.status(200).send();
        }

    }
    catch (e) {
        if (e.response) {
            functions.logger.error(e.response?.data);
            res.status(e.response?.status);
            res.send(e.response?.data);
        }
        else {
            functions.logger.error(e);
            res.status(502);
            res.send(e);
        }
    }
}


/**
 * Authenticates the user using the authorization code supplied when user authorized with Spotify
 * Should not be used if the refresh token method can be used instead
 * 
 * @param {string} authCode the code supplied after authorizing
 * @param {string} redirectUri must match the redirectUri given when authorizing
 * @param {string} codeVerifier supplied by the client so they can verify authenticity of access token
 * @returns Promise associated with handling the authentication request
 */
function authenticateCode(authCode: string, redirectUri: string, codeVerifier: string) {
    functions.logger.debug(`Authenticating spotify user using auth code`);

    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("grant_type", "authorization_code");
    params.append("code", authCode);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", codeVerifier);

    return handleAuthRequest(params);
}


/**
 * Authenticates the user using the refresh token supplied when authenticating using the original auth code
 * Should be used over the auth code option whenever possible (ie. refresh token exists & not revoked)
 * 
 * @param {string} userId id of the Spotify user to authenticate
 * @returns Promise associated with handling the authentication request (if refresh token does not exist, returns rejected Promise instead)
 */
async function authenticateRefresh(userId:  string) {
    functions.logger.debug(`Authenticating spotify user ${userId} using refresh token`);

    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("grant_type", "refresh_token");

    try {
        let authData = await spotifyFirestore.auth.getUserAuth(userId);
        params.append("refresh_token", authData.refresh_token);

        return handleAuthRequest(params);
    }
    catch (e) {
        return Promise.reject(e);
    }
}


/**
 * Sends [params] to Spotify's token endpoint, authenticating the user.
 * On success, it caches and stores the result in Firestore.
 * On failure, it returns a rejected promise to be handled by the calling function.
 * 
 * @param {URLSearchParams} params params to send to the Spotify token endpoint
 * @returns Promise associated with the request sent to Spotify and the storing of the result (if successful)
 */
async function handleAuthRequest(params: URLSearchParams): Promise<SpotifyUserAuth> {
    let tokenUrl = "https://accounts.spotify.com/api/token";
    
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    };

    let grantType = params.get("grant_type");

    let paramEntries: {[param: string]: string} = {};
    // Display the key/value pairs
    for(var pair of params.entries()) {
        paramEntries[pair[0]] = pair[1];
    }

    functions.logger.debug(`Sending Spotify authentication request with params: ${JSON.stringify(paramEntries)}`);


    try {
        let authResponse = await axios.post(tokenUrl, params, {
            'headers': headers
        });

        var expiresAt = util.convertDateToUtc(new Date());
        expiresAt.setSeconds(expiresAt.getSeconds() + 0.85 * authResponse.data.expires_in);
        
        var authData: SpotifyAuth = {
            'access_token': authResponse.data.access_token,
            'refresh_token': authResponse.data.refresh_token,
            'expires_at': expiresAt
        };

        // update scopes on initial authenticaton with code
        if (grantType == 'authorization_code') {
            authData.scopes = REQUIRED_SCOPES;
        }

        return await updateUserAuth(authData);
    }
    catch (e) {
        return Promise.reject(e);
    }
}


/**
 * Gets the user id from Spotify using [authData] and puts [authData] in the cache and Firestore
 * in the related user documents and caches
 * 
 * @param {SpotifyAuth} authData 
 * @returns Promise associated with spotifyUsers.getUser
 */
async function updateUserAuth(authData: SpotifyAuth): Promise<SpotifyUserAuth> {
    try {
        let spotifyUser = await spotifyUsers.getUser({
            'Authorization': `Bearer ${authData.access_token}`
        });

        functions.logger.debug(`updateUserAuth userResponse.data: ${JSON.stringify(spotifyUser)}`);

        var userId = spotifyUser.id;
        

        await spotifyFirestore.auth.putUserAuth(userId, authData);

        return {
            'user_id': userId,
            'auth': authData
        };
    }
    catch (e) {
        return Promise.reject(e);
    }
}


/**
 * Checks whether the refresh token would have been revoked due to additional scopes being required
 * 
 * @param {Array<string>} scopes 
 * @returns whether [scopes] contains all values of [REQUIRED_SCOPES]
 */
function isScopesValid(scopes: Array<string>): boolean {
    let scopesSet = new Set(scopes);
    let reqScopesSet = new Set(REQUIRED_SCOPES);

    if (scopesSet.size < reqScopesSet.size) {
        return false;
    }

    for (const scope of reqScopesSet) {
        if (!scopesSet.has(scope)) {
            return false;
        }
    }

    return true;
}


/**
 * Ensures that the routes using this middleware receive a request with an Authorization header
 * with the Spotify user's authorization details
 * 
 * If the access token needs to be refreshed, the middleware handles this.
 * If the user must be re-authorized they are notified with a 401 error & message
 * If the user id is not included in the original headers, the client is notified with a 401 & message
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
export async function authMiddleware(req: express.Request, res: express.Response, next: Function): Promise<void> {
    // all requests must have a user header from the firebase auth middleware
    let firebaseUserId: string = JSON.parse(req.get('user')!).uid;

    if (!firebaseUserId) { // assume all routes using middleware require a user id
        res.status(400).send("No user id was provided!");
    }

    try {
        let spotifyUserId = await authFirebase.getSpotifyUserId(firebaseUserId);
        let authData = await spotifyFirestore.auth.getUserAuth(spotifyUserId);

        var currTime = util.convertDateToUtc(new Date());

        // Token has not expired
        if (currTime.getTime() < authData.expires_at.getTime()) {
            if (authData.scopes && isScopesValid(authData.scopes!)) {

                // add Spotify Authorization header to request
                let authHeaderEntry = await getAuthHeaderEntry(spotifyUserId);
                req.headers['Authorization'] = authHeaderEntry;
                next();

            }
            else { // More required scopes than provided with token, re-authorize!
                res.status(401);
                res.send({
                    'error': 'invalid_grant',
                    'error_description': 'Refresh token revoked'
                });
            }
        }
        else { // Token has expired - refresh it

            try {
                await authenticateRefresh(spotifyUserId);

                // success -> add Spotify Authorization header to request
                let authHeaderEntry = await getAuthHeaderEntry(spotifyUserId);
                req.headers['Authorization'] = authHeaderEntry;
                next();
            }
            catch (e) {
                functions.logger.error(`authMiddleware: Error ${JSON.stringify(e.response?.data)}`);

                // refresh token revoked should be a 401 error
                if (e.response?.status == 400 && e.response?.data?.error === 'invalid_grant') {
                    e.response.status = 401;
                }

                res.status(e.response?.status);
                res.send(e.response?.data);
            }
        }
    }
    catch (e) {
        if (e.response) {
            functions.logger.error(e.response?.data);
            res.status(e.response?.status ?? 502);
            res.send(e.response?.data);
        }
        else {
            functions.logger.error(e);
            res.status(502);
            res.send(e);
        }
    }
}


/**
 * @param {string} userId the id of the Spotify user
 * @returns the authorization header value for Spotify on success, null on failure
 */
async function getAuthHeaderEntry(userId: string): Promise<string> {
    try {
        let userAuth = await spotifyFirestore.auth.getUserAuth(userId);
        return `Bearer ${userAuth.access_token}`;
    }
    catch (e) {
        functions.logger.error("Cannot get the user's auth details!!" + e);
        return Promise.reject(e);
    }
}


export let router = express.Router({'mergeParams': true});

// Covers authorization & authentication
router.route('/')
    .get(authorize)
    .post(authenticate);


router.use('/isAuthenticated', authMiddleware);
router.get('/isAuthenticated', (req, res) => {
    var headers = util.filterHeaders(req.headers);

    isAuthenticated(headers).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        if (error.response) {
            res.status(error.response.status);
            res.send(error.response.data);
        }
        else {
            res.status(502);
            res.send(error);
        }
    });
 })