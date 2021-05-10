const express = require('express');
const axios = require('axios');
const url = require('url');

const util = require('../../../util/util.js');


/**
 * Gets info about the requesting user
 * 
 * @param {Object} headers must contain Authorization header
 * @returns information about the user associated with Authorization header
 */
function getUser(headers) {
    // forward to Spotify service
    var spotifyUrl = new url.URL('https://api.spotify.com/v1/me');

    console.log(`GET ${spotifyUrl.href}`);

    return axios.get(spotifyUrl.href, {
        'headers': headers
    })
}


var router = express.Router({'mergeParams': true});

// gets info about the authorized user
router.get('/me', (req, res) => {
    getUser(util.filterHeaders(req.headers))
        .then((serviceRes) => {
            res.send(serviceRes.data);
        })
        .catch((error) => {
            res.status(error.response.status);
            res.send(error.response.data);
        });
});


module.exports.router = router;

module.exports.getUser = getUser;