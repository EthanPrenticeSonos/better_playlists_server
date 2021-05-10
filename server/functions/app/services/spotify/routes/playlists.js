const express = require('express');
const axios = require('axios');
const url = require('url');
const util = require('../../../util/util.js');
const config = require('../../../config.js');


/**
 * Gets the playlists (basic info) followed by the authorized user
 * Calling function must handle errors on promise rejection
 * 
 * @param {URLSearchParams} searchParams 
 * @param {Object} headers 
 * @returns Promise associated with getting the playlists (promise returns playlists on success)
 */
function getUserPlaylists(searchParams, headers) {
    var spotifyUrl = new url.URL('https://api.spotify.com/v1/me/playlists');

    var reqConfig = {
        'headers': headers
    };

    // if map of params, make it of type URLSearchParams
    if (!(searchParams instanceof URLSearchParams)) {
        searchParams = new URLSearchParams(searchParams);
    }
    spotifyUrl.search = searchParams;

    return axios.get(spotifyUrl.href, reqConfig).then(serviceRes => {
        console.log(`Received serviceRes.data=${JSON.stringify(serviceRes.data)}`);

        // change 'next' url to point to server
        if (serviceRes.data.next != null) {
            var nextUrl = new url.URL(serviceRes.data.next);
            nextUrl.host = config.hostUrl;
            nextUrl.pathname = '/spotify/playlists/me';
            serviceRes.data.next = nextUrl.href;
        }

        return serviceRes.data;
    });
}


/**
 * Gets more in-depth info about a playlist by it's id
 * Calling function must handle errors on promise rejection
 * 
 * @param {String} playlistId 
 * @param {URLSearchParams} searchParams 
 * @param {Object} headers 
 * @returns 
 */
function getPlaylistById(playlistId, searchParams, headers) {
    var spotifyUrl = new url.URL(`https://api.spotify.com/v1/playlists/${playlistId}`);

    var reqConfig = {
        'headers': headers
    };

    // if map of params, make it of type URLSearchParams
    if (!(searchParams instanceof URLSearchParams)) {
        searchParams = new URLSearchParams(searchParams);
    }
    spotifyUrl.search = searchParams;

    return axios.get(spotifyUrl.href, reqConfig).then(res => {
        var playlist = res.data;

        // change 'next' url to point to server rather than Spotify
        if (playlist.tracks.next != null) {
            var nextUrl = new url.URL(playlist.tracks.next);
            nextUrl.host = config.hostUrl;
            nextUrl.pathname = `/spotify/playlists/${playlistId}`;
            serviceRes.data.next = nextUrl.href;
        }

        return playlist;
    })
}


var router = express.Router({'mergeParams': true});


// responds with the user's followed playlists (basic info) if successful
router.get('/me', (req, res) => {
    console.log("requested all user's playlists.");
    
    var searchParams = req.query;
    var headers = util.filterHeaders(req.headers);

    getUserPlaylists(searchParams, headers)
        .then(playlists => {
            res.status(200).send(playlists);
        })
        .catch(error => {
            console.log("Error getting Spotify user's playlists.");
            console.log(error);

            if (error.response) {
                res.status(error.response.status);
                res.send(error.response.data);
            }
        });
    
});

// responds with more in-depth info about a specific playlist if successful
router.get('/:playlistId', (req, res) => {
    var playlistId = req.params.playlistId;
    var searchParams = req.query;
    var headers = util.filterHeaders(req.headers);

    getPlaylistById(playlistId, searchParams, headers)
        .then(playlist => {
            res.status(200).send(playlist);
        })
        .catch(error => {
            console.log("Error getting Spotify user's playlists.");
            console.log(error);

            if (error.response) {
                res.status(error.response.status);
                res.send(error.response.data);
            }
        });
});

module.exports.router = router;