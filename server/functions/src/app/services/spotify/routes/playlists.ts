import * as express from 'express';
import * as url from 'url';
import * as functions from 'firebase-functions';
import axios from 'axios';

const util = require('../../../util/util');
const config = require('../../../config');


/**
 * Gets the playlists (basic info) followed by the authorized user
 * Calling function must handle errors on promise rejection
 * 
 * @param {URLSearchParams} searchParams 
 * @param {Object} headers 
 * @returns Promise associated with getting the playlists (promise returns playlists on success)
 */
async function getUserPlaylists(searchParams: URLSearchParams, headers: Headers): Promise<Object> {
    var spotifyUrl = new url.URL('https://api.spotify.com/v1/me/playlists');

    var reqConfig = {
        'headers': headers
    };

    spotifyUrl.search = searchParams.toString();

    try {
        let playlistsRes = await axios.get(spotifyUrl.href, reqConfig);

        if (playlistsRes?.data?.next) {
            var nextUrl = new url.URL(playlistsRes.data.next);
            nextUrl.host = config.hostUrl;
            nextUrl.pathname = '/spotify/playlists/me';
            playlistsRes.data.next = nextUrl.href;
        }

        return playlistsRes.data;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
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
async function getPlaylistById(playlistId: String, searchParams: URLSearchParams, headers: Headers): Promise<Object> {
    let spotifyUrl = new url.URL(`https://api.spotify.com/v1/playlists/${playlistId}`);

    let reqConfig = {
        'headers': headers
    };

    spotifyUrl.search = searchParams.toString();

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let playlist = (await axios.get(spotifyUrl.href, reqConfig))!.data;

        // change 'next' url to point to server rather than Spotify
        if (playlist?.tracks?.next) {
            var nextUrl = new url.URL(playlist.tracks.next);
            nextUrl.host = config.hostUrl;
            nextUrl.pathname = `/spotify/playlists/${playlistId}/tracks`;
            playlist.tracks.next = nextUrl.href;
        }

        return playlist;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
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
 async function getPlaylistTracksById(playlistId: String, searchParams: URLSearchParams, headers: Headers): Promise<Object> {
    let spotifyUrl = new url.URL(`https://api.spotify.com/v1/users/spotify/playlists/${playlistId}/tracks`);

    let reqConfig = {
        'headers': headers
    };

    spotifyUrl.search = searchParams.toString();

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let playlistTracks = (await axios.get(spotifyUrl.href, reqConfig))!.data;

        // change 'next' url to point to server rather than Spotify
        if (playlistTracks?.next) {
            var nextUrl = new url.URL(playlistTracks.next);
            nextUrl.host = config.hostUrl;
            nextUrl.pathname = `/spotify/playlists/${playlistId}/tracks`;
            playlistTracks.next = nextUrl.href;
        }

        return playlistTracks;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
}



var router = express.Router({'mergeParams': true});


// responds with the user's followed playlists (basic info) if successful
router.get('/me', async (req, res) => {
    console.log("requested all user's playlists.");
    
    // @ts-ignore
    let searchParams = new URLSearchParams(req.query);

    let headers = util.filterHeaders(req.headers);

    try {
        let playlists = await getUserPlaylists(searchParams, headers);
        res.status(200).send(playlists);
    }
    catch (e) {
        functions.logger.error('Error getting Spotify user\'s playlists', e);

        if (e.response) {
            res.status(e.response.status);
            res.send(e.response.data);
        }
        else {
            res.status(502).send(e);
        }
    }
});


// get tracks of a playlist by id
router.get('/:playlistId/tracks', (req, res) => {
    var playlistId = req.params.playlistId;
    // @ts-ignore 
    var searchParams = new URLSearchParams(req.query);

    var headers = util.filterHeaders(req.headers);

    getPlaylistTracksById(playlistId, searchParams, headers)
        .then(playlistTracks => {
            res.status(200).send(playlistTracks);
        })
        .catch(error => {
            console.log("Error getting Spotify playlist tracks");
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
    // @ts-ignore 
    var searchParams = new URLSearchParams(req.query);

    var headers = util.filterHeaders(req.headers);

    getPlaylistById(playlistId, searchParams, headers)
        .then(playlist => {
            res.status(200).send(playlist);
        })
        .catch(error => {
            console.log("Error getting Spotify playlist by id.");
            console.log(error);

            if (error.response) {
                res.status(error.response.status);
                res.send(error.response.data);
            }
        });
});


module.exports.router = router;