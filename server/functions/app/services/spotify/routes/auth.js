const express = require('express');
const axios = require('axios');
const url = require('url');
const util = require('../../../util/util.js');
const functions = require('firebase-functions');


const authFirebase = require('../../../firebase/auth.js');
const spotifyFirestore = require('../firestore/spotify_firestore.js');
const spotifyUsers = require('./users.js');

const SpotifyAuth = require('../adt/spotify_auth.js');


const SPOTIFY_CLIENT_ID = "79cde8abd53b43058474f611783fdf9b";

const REQUIRED_SCOPES = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public"
];


function isAuthenticated(headers) {
    // test if we can get the user
    var spotifyUrl = new url.URL('https://api.spotify.com/v1/me');

    console.log(`isAuth headers=${JSON.stringify(headers)}`);
    
    return axios.get(spotifyUrl.href, {
        'headers': headers
    }).then(_ => {
        return true;
    })
    .catch(error => {
        if (error.response) {
            if (error.response.status === 401) {
                return false;
            }
            if (error.response.status === 400 && error.response.data.error === 'invalid_grant') {
                return false;
            }
            else {
                return Promise.reject(error);
            }
        }
        else {
            if (error.status === 404 && error.error === "User does not exist") {
                return false;
            }
            else {
                return Promise.reject(error);
            }
        }
    });
}


/**
 * Authorizes the user with Spotify by redirecting them to Spotify's authorization page
 * @param {Request} req 
 * @param {Response} res 
 * @returns an authorization code to the redirectUri specified in [res.query]
 */
function authorize(req, res) {
    // forward to Spotify service
    var redirectUrl = new url.URL("https://accounts.spotify.com/authorize");
    
    var params = new URLSearchParams(req.query);
    params.append('client_id', SPOTIFY_CLIENT_ID);
    params.append('scope', REQUIRED_SCOPES.join(' '));
    params.append('response_type', 'code');
    redirectUrl.search = params;
    
    console.log(`Redirecting to ${redirectUrl.href}`);
    
    res.redirect(307, redirectUrl);
}


/**
 * Authenticates the user using the given grant_type (authorization_code or refresh_token)
 * The [SpotifyAuth] object is then cached and stored in Firestore
 * @param {Request} req 
 * @param {Response} res 
 * @returns the user id associated with the Spotify user that was authenticated
 */
function authenticate(req, res) {
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

    authPromise.then(authResponse => {
        var firebaseUserId = req.get('user').uid;
        var spotifyUserId = authResponse.user_id;

        if (firebaseUserId === spotifyUserId) {           
            res.status(409).send({
                'error': 'User already associated with another Spotify account!'
            })
        }
        else {
            functions.logger.log(`Firebase user \'${firebaseUserId}\' registered with Spotify account ${spotifyUserId}`);
            authFirebase.addSpotifyUserId(firebaseUserId, spotifyUserId)
                .then(_ => {
                    // don't send back all auth data - keep it contained in server
                    res.status(200).send();

                }).catch(error => {
                    if (error.response) {
                        functions.logger.error(error.response.data);
                        res.status(error.response.status);
                        res.send(error.response.data);
                    }
                    else {
                        functions.logger.error(error);
                        res.status(502);
                        res.send(error);
                    }
                });
        }

    }).catch(error => {

        if (error.response && error.response.data.error) {
            functions.logger.error(error.response.data);
            res.status(error.response.data.error.status);
            res.send(error.response.data.error);
        }
        else if (error.response) {
            functions.logger.error(error.response.data);
            res.status(error.response.status);
            res.send(error.response.data);
        }
        else {
            functions.logger.error(error);
            res.status(502);
            res.send(error);
        }

    });
}


/**
 * Authenticates the user using the authorization code supplied when user authorized with Spotify
 * Should not be used if the refresh token method can be used instead
 * 
 * @param {String} authCode the code supplied after authorizing
 * @param {String} redirectUri must match the redirectUri given when authorizing
 * @param {String} codeVerifier supplied by the client so they can verify authenticity of access token
 * @returns Promise associated with handling the authentication request
 */
function authenticateCode(authCode, redirectUri, codeVerifier) {
    console.log(`Authenticating spotify user using auth code`);

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
 * @param {String} userId id of the Spotify user to authenticate
 * @returns Promise associated with handling the authentication request (if refresh token does not exist, returns rejected Promise instead)
 */
function authenticateRefresh(userId) {
    console.log(`Authenticating spotify user ${userId} using refresh token`);

    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("grant_type", "refresh_token");

    return spotifyFirestore.auth.getUserAuth(userId)
        .then(authData => {
            params.append("refresh_token", authData.refresh_token);

            return handleAuthRequest(params);
        })
        .catch(error => {
            console.log(`authenticateRefresh error: (${error.response.status}) ${JSON.stringify(error.response.data)}`);
            return Promise.reject(error);
        });
}


/**
 * Sends [params] to Spotify's token endpoint, authenticating the user.
 * On success, it caches and stores the result in Firestore.
 * On failure, it returns a rejected promise to be handled by the calling function.
 * 
 * @param {URLSearchParams} params params to send to the Spotify token endpoint
 * @returns Promise associated with the request sent to Spotify and the storing of the result (if successful)
 */
function handleAuthRequest(params) {
    var tokenUrl = "https://accounts.spotify.com/api/token";
    
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    };

    var grantType = params.get("grant_type");

    var paramEntries = {}
    // Display the key/value pairs
    for(var pair of params.entries()) {
        paramEntries[pair[0]] = pair[1];
    }

    console.log(`Sending auth request with params: ${JSON.stringify(paramEntries)}`);

    return axios.post(tokenUrl, params, {
        'headers': headers
    }).then(authResponse => {

        console.log(`handling auth response: ${JSON.stringify(authResponse.data)}`);

        var expiresAt = util.convertDateToUtc(new Date());
        expiresAt.setSeconds(expiresAt.getSeconds() + 0.85 * authResponse.data.expires_in);
        
        var authData = new SpotifyAuth(
            authResponse.data.access_token,
            authResponse.data.refresh_token,
            expiresAt
        );


        // update scopes on initial authenticaton with code
        if (grantType == 'authorization_code') {
            authData.scopes = REQUIRED_SCOPES;
        }

        var userAuthData = updateUserAuth(authData);
        return userAuthData;
    });
}


/**
 * Gets the user id from Spotify using [authData] and puts [authData] in the cache and Firestore
 * in the related user documents and caches
 * 
 * @param {SpotifyAuth} authData 
 * @returns Promise associated with spotifyUsers.getUser
 */
function updateUserAuth(authData) {
    return spotifyUsers.getUser({
        'Authorization': `Bearer ${authData.access_token}`
    }).then(userResponse => { // get userId from auth data

        console.log(`updateUserAuth userResponse.data: ${JSON.stringify(userResponse.data)}`);

        var userId = userResponse.data.id;

        return spotifyFirestore.auth.putUserAuth(
            userId,
            authData
        
        ).then(_ => {
            return {
                'user_id': userId,
                'auth': authData
            };

        }).catch(error => {
            console.log(`updateUserAuth error: ${JSON.stringify(error)}`);
            return Promise.reject(error);
        });
    }).catch(error => {
        console.log(`auth.getUser error: ${JSON.stringify(error)}`);
        return Promise.reject(error);
    });
}


/**
 * Checks whether the refresh token would have been revoked due to additional scopes being required
 * 
 * @param {Array[String]} scopes 
 * @returns whether [scopes] contains all values of [REQUIRED_SCOPES]
 */
function isScopesValid(scopes) {
    var scopesSet = new Set(scopes);
    var reqScopesSet = new Set(REQUIRED_SCOPES);

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
function authMiddleware(req, res, next) {
    // all requests must have a user header from the firebase auth middleware
    var firebaseUserId = req.get('user').uid;

    if (!firebaseUserId) { // assume all routes using middleware require a user id
        res.status(400).send("No user id was provided!");
    }

    authFirebase.getSpotifyUserId(firebaseUserId).then(userId => {
        spotifyFirestore.auth.getUserAuth(userId)
        .then(authData => {

            var currTime = util.convertDateToUtc(new Date());

            console.log(`auth object = ${JSON.stringify(authData)}`);

            // valid - access token has not expired
            if (currTime.getTime() < authData.expires_at.getTime()) {
                if (isScopesValid(authData.scopes)) {
                    
                    // add auth header, remove user id header
                    getAuthHeaderEntry(userId).then(authEntry => {
                        req.headers['Authorization'] = authEntry;

                        next();
                    });

                }
                else {
                    res.status(401);
                    res.send({
                        'error': 'invalid_grant',
                        'error_description': 'Refresh token revoked'
                    });
                }
            }
            else {
                // access token has expired, refresh it
                authenticateRefresh(userId).then(_ => {

                    // add auth header, remove user id header
                    getAuthHeaderEntry(userId).then(authEntry => {
                        req.headers['Authorization'] = authEntry;

                        next();
                    });
                
                }).catch(error => { // unexpected error
                    console.log(`authMiddleware: Error ${JSON.stringify(error.response.data)}`);

                    // refresh token revoked should be a 401 error
                    if (error.response.status == 400 && error.response.data.error === 'invalid_grant') {
                        error.response.status = 401;
                    }

                    res.status(error.response.status);
                    res.send(error.response.data);
                });
            }
        }).catch(error => {
            if (error.status === 404) { // un-authorized - no user created
                res.status(401);
                res.send({
                    'error_description': 'No user has been created yet!'
                });
            }
            else {
                console.log(`authMiddleware: Error ${JSON.stringify(error.response.data)}`);
            }
        });
    })
    .catch(error => {
        if (error.response) {
            functions.logger.error(error.response.data);
            res.status(error.response.status);
            res.send(error.response.data);
        }
        else {
            functions.logger.error(error);
            res.status(502);
            res.send(error);
        }

    });
}


/**
 * @param {String} userId the id of the Spotify user
 * @returns the authorization header value for Spotify on success, null on failure
 */
 function getAuthHeaderEntry(userId){
    return spotifyFirestore.auth.getUserAuth(userId)
        .then(userAuth => {
            return `Bearer ${userAuth.access_token}`;
        }).catch(error => {
            console.log("Cannot get the user's auth details!!" + error);
            return null;
        });
}


/**
 * @param {String} userId the id of the Spotify user
 * @returns the header for Spotify authentication on success, null on failure
 */
function getAuthHeader(userId) {
    return getAuthHeaderEntry(userId).then(entry => {
        if (entry == null) {
            return null;
        }
        else {
            return {'Authorization': entry};
        }
    }).catch(error => {
        console.log("Cannot get the user's auth details!!" + error);
        return null;
    });
}




var router = express.Router({'mergeParams': true});

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


module.exports.router = router;

module.exports.authMiddleware = authMiddleware;