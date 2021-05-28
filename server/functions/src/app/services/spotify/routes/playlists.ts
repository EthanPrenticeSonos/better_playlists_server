import * as express from 'express';
import { URL, URLSearchParams } from 'url';
import * as functions from 'firebase-functions';
import axios from 'axios';

import { Headers } from '../../../adt/routing/headers'
import * as util from '../../../util/util';
import { parseResponseError } from '../../../adt/error/response_error';


const SPOTIFY_TRACK_FIELDS = 
    `id,` +
    `name,` +
    `owner,` +
    `images,` +
    `public,` +
    `collaborative,` +
    `snapshot_id,` +
    `tracks(` +
        `items(` +
            `added_at,` +
            `track(` +
                `album(` +
                    `id,` +
                    `images,` +
                    `name` +
                `),` +
                `artists,` +
                `id,` +
                `uri,` +
                `name,` +
                `track_number,` +
            `),` +
        `),` +
        `limit,` +
        `next,` +
        `offset,` +
        `total` + 
    `)`;


const SPOTIFY_TRACKS_ONLY_FIELDS = 
    `items(` +
        `added_at,` +
        `track(` +
            `album(` +
                `id,` +
                `images,` +
                `name` +
            `),` +
            `artists,` +
            `id,` +
            `uri,` +
            `name,` +
            `track_number,` +
        `),` +
    `),` +
    `limit,` +
    `next,` +
    `offset,` +
    `total`;


/**
 * Gets the playlists (basic info) followed by the authorized user
 * Calling function must handle errors on promise rejection
 * 
 * @param {URLSearchParams} searchParams 
 * @param {Object} headers 
 * @returns Promise associated with getting the playlists (promise returns playlists on success)
 */
async function getUserPlaylists(searchParams: URLSearchParams, headers: Headers): Promise<any> {
    var spotifyUrl = new URL('https://api.spotify.com/v1/me/playlists');

    var reqConfig = {
        'headers': headers
    };

    spotifyUrl.search = searchParams.toString();

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let playlistsRes = await axios.get(spotifyUrl.href, reqConfig);

        if (playlistsRes?.data?.next) {
            let nextUrl = new URL(playlistsRes.data.next);
            let proxiedUrl = util.getProxyUrl(nextUrl, 'spotify/playlists/me');
            playlistsRes.data.next = proxiedUrl.href;
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
async function getPlaylistById(playlistId: String, headers: Headers): Promise<any> {
    let spotifyUrl = new URL(`https://api.spotify.com/v1/playlists/${playlistId}`);

    let reqConfig = {
        'headers': headers
    };

    spotifyUrl.searchParams.append('fields', SPOTIFY_TRACK_FIELDS);

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let playlist = (await axios.get(spotifyUrl.href, reqConfig))!.data;

        // playlist must be owned to edit using Spotify API
        playlist.can_edit = (playlist.owner.id === headers.user_id);

        // change 'next' url to point to server rather than Spotify
        if (playlist?.tracks?.next) {
            let nextUrl = new URL(playlist.tracks.next);
            let proxiedUrl = util.getProxyUrl(nextUrl, `spotify/playlists/${playlistId}/tracks`);
            playlist.tracks.next = proxiedUrl.href;
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
 async function getPlaylistTracksById(playlistId: String, headers: Headers, searchParams: URLSearchParams): Promise<any> {
    let spotifyUrl = new URL(`https://api.spotify.com/v1/users/spotify/playlists/${playlistId}/tracks`);

    let reqConfig = {
        'headers': headers
    };

    for (let param in searchParams.entries()) {
        param[0]
    }

    spotifyUrl.search = searchParams.toString();
    spotifyUrl.searchParams.append('fields', SPOTIFY_TRACKS_ONLY_FIELDS);

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let playlistTracks = (await axios.get(spotifyUrl.href, reqConfig))!.data;

        // change 'next' url to point to server rather than Spotify
        if (playlistTracks.next) {
            let nextUrl = new URL(playlistTracks.next);
            let proxiedUrl = util.getProxyUrl(nextUrl, `spotify/playlists/${playlistId}/tracks`);
            playlistTracks.next = proxiedUrl.href;
        }

        return playlistTracks;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
}



export const router = express.Router({'mergeParams': true});


// responds with the user's followed playlists (basic info) if successful
router.get('/me', async (req, res) => {
    functions.logger.debug(`Requested all playlists for Spotify user`);
    
    // @ts-ignore
    let searchParams = new URLSearchParams(req.query);

    let headers = util.filterHeaders(req.headers);

    try {
        let playlists = await getUserPlaylists(searchParams, headers);
        res.status(200).send(playlists);
    }
    catch (e) {
        let resError = parseResponseError(e);
        res.status(resError.status_code).send(resError);

        if (e.response) {
            functions.logger.error('Error getting Spotify user\'s playlists', e.response?.data);
        }
        else {
            functions.logger.error('Error getting Spotify user\'s playlists', e);
        }
    }
});


// get tracks of a playlist by id
router.get('/:playlistId/tracks', (req, res) => {
    var playlistId = req.params.playlistId;

    functions.logger.debug(`Requested tracks for Spotify playlist ${playlistId}`);


    // @ts-ignore 
    var searchParams = new URLSearchParams(req.query);

    var headers = util.filterHeaders(req.headers);

    getPlaylistTracksById(playlistId, headers, searchParams)
        .then(playlistTracks => {
            res.status(200).send(playlistTracks);
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


// responds with more in-depth info about a specific playlist if successful
router.get('/:playlistId', (req, res) => {
    var playlistId = req.params.playlistId;

    functions.logger.debug(`Requested details about Spotify playlist ${playlistId}`);

    // @ts-ignore 
    var searchParams = new URLSearchParams(req.query);

    var headers = util.filterHeaders(req.headers);

    getPlaylistById(playlistId, headers)
        .then(playlist => {
            res.status(200).send(playlist);
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