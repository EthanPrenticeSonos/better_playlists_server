import * as express from 'express';
import * as url from 'url';
import * as functions from 'firebase-functions';
import axios from 'axios';

const util = require('../../../util/util');


/**
 * Gets info about the requesting user
 * 
 * @param {Headers} headers must contain Authorization header
 * @returns information about the user associated with Authorization header
 */
async function getUser(headers: Headers): Promise<Object> {
    // forward to Spotify service
    var spotifyUrl = new url.URL('https://api.spotify.com/v1/me');

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


var router = express.Router({'mergeParams': true});

// gets info about the authorized user
router.get('/me', (req, res) => {
    getUser(util.filterHeaders(req.headers))
        .then(userData => {
            res.send(userData);
        })
        .catch(error => {
            if (error.response) {
                res.status(error.response?.status ?? 502);
                res.send(error.response?.data);
            }
            else {
                functions.logger.error(error);
                res.status(502);
                res.send(error);
            }
        });
});


module.exports.router = router;

module.exports.getUser = getUser;