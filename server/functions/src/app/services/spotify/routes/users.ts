import * as express from 'express';
import * as url from 'url';
import * as functions from 'firebase-functions';
import axios from 'axios';

import { Headers } from '../../../adt/routing/headers';
import * as util from '../../../util/util';
import { parseResponseError } from '../../../adt/error/response_error';


/**
 * Gets info about the requesting user
 * 
 * @param {Headers} headers must contain Authorization header
 * @returns information about the user associated with Authorization header
 */
export async function getUser(headers: Headers): Promise<any> {
    // forward to Spotify service
    var spotifyUrl = new url.URL('https://api.spotify.com/v1/me');

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let userResponse = await axios.get(spotifyUrl.href, {
            'headers': headers
        });
        return userResponse.data;
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export const router = express.Router({'mergeParams': true});

// gets info about the authorized user
router.get('/me', (req, res) => {
    functions.logger.debug(`Requesting details about Spotify user`);
    getUser(util.filterHeaders(req.headers))
        .then(userData => {
            res.send(userData);
        })
        .catch(e => {
            let resError = parseResponseError(e);
            res.status(resError.status_code).send(resError);
    
            if (e.response) {
                functions.logger.error('Error getting Spotify playlist tracks', e.response?.data);
            }
            else {
                functions.logger.error('Error getting Spotify playlist tracks', e);
            }
        });
});