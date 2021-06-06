import { URL } from 'url';
import * as functions from 'firebase-functions';
import axios from 'axios';

import { PlaylistOperation } from "../../../playlist_managment/adt/operations/playlist_operation";
import * as auth from '../routes/auth'
import { Headers } from '../../../adt/routing/headers';
import { getPlaylistGraph } from '../../../playlist_managment/firestore/playlist_graph';


const SPOTIFY_TRACK_FIELDS = 
    `id,` +
    `name,` +
    `owner,` +
    `snapshot_id,` +
    `tracks(` +
        `items(` +
            `added_at,` +
            `track(` +
                `id,` +
                `uri,` +
            `),` +
        `),` +
        `limit,` +
        `next,` +
        `offset,` +
        `total` + 
    `)`;


export async function executeGraphUpdates(userId: string): Promise<void> {
    try {
        let graph = await getPlaylistGraph('spotify', userId);
        if (graph === null) {
            return;
        }

        let operations = graph.getOrderOfOperations();
        await executeAdditions(userId, operations);

    } catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
}

async function executeAdditions(userId: string, operations: PlaylistOperation[]): Promise<void> {
    let tracksToAddTo: {[pid: string]: any[]} = { };

    for (let op of operations) {
        if (!tracksToAddTo[op.dest_id]) {
            tracksToAddTo[op.dest_id] = [];
        }

        if (tracksToAddTo[op.source_id]) { // bubble up tracks ops from children
            tracksToAddTo[op.dest_id] = tracksToAddTo[op.dest_id].concat(tracksToAddTo[op.source_id]);
        }

        tracksToAddTo[op.dest_id] = tracksToAddTo[op.dest_id].concat(await getValidTrackItems(userId, op));
    }

    functions.logger.log(`Track additions map`, {
        tracksToAddTo: tracksToAddTo
    });

    for (let playlistId in tracksToAddTo) {
        if (tracksToAddTo[playlistId].length === 0) {
            continue;
        }

        let sortedTrackUris = tracksToAddTo[playlistId].sort((a: any, b: any) => {
            return Date.parse(a.added_at) - Date.parse(b.added_at);
        }).map((x) => x.track.uri);

        // remove duplicates
        for (let i = 1; i < sortedTrackUris.length;) {
            let dupeCount = 0;
            while (sortedTrackUris[i-1] === sortedTrackUris[i]) {
                dupeCount++;
                i++;
            }
            if (dupeCount > 0) {
                sortedTrackUris.splice(i-dupeCount, dupeCount);
                i -= dupeCount;
            }
            i++;
        }

        functions.logger.log(`Adding track URIs to playlist ${playlistId}`, {
            tracks: sortedTrackUris
        });

        await addTracks(userId, playlistId, sortedTrackUris);
    }
}

async function getValidTrackItems(userId: string, operation: PlaylistOperation): Promise<any[]> {
    let srcData = await getPlaylistTrackData(userId, operation.source_id);
    let destData = await getPlaylistTrackData(userId, operation.dest_id);

    let destTrackIds = new Set(destData.tracks.items.map((x: any) => x.track.id));

    // after date and no duplicates
    return srcData.tracks.items.filter((x: any) => {
        return Date.parse(x.added_at) >= operation.after_date.getTime()
            && !destTrackIds.has(x.track.id);
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
async function getPlaylistTrackData(userId: string, playlistId: string): Promise<any> {
    let spotifyUrl = new URL(`https://api.spotify.com/v1/playlists/${playlistId}`);

    let headers: Headers = {
        'Authorization': await auth.getAuthHeaderEntry(userId)
    }

    let reqConfig = {
        'headers': headers
    };

    spotifyUrl.searchParams.append('fields', SPOTIFY_TRACK_FIELDS);

    functions.logger.debug(`Redirecting request to ${spotifyUrl.href}`);

    try {
        let playlist = (await axios.get(spotifyUrl.href, reqConfig))!.data;

        // playlist must be owned to edit using Spotify API
        playlist.can_edit = (playlist.owner.id === userId);

        // TODO: do a Firebase check for snapshot_id here

        if (playlist.tracks.next) {
            let nextUrl = playlist.tracks.next
            let tracksResponse: any = null;
            do {
                tracksResponse = getNextTracks(headers, nextUrl);
                playlist.tracks.items.concat(tracksResponse.items);
                nextUrl = tracksResponse.next;
            } while (nextUrl);
        }

        return playlist;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
}


async function getNextTracks(headers: Headers, nextUrl: string): Promise<any> {
    let reqConfig = {
        'headers': headers
    };

    functions.logger.debug(`Redirecting request to ${nextUrl}`);

    try {
        let playlistTracks = (await axios.get(nextUrl, reqConfig))!.data;
        return playlistTracks;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
}


async function addTracks(userId: string, playlistId: string, trackUris: string[]): Promise<string|null> {    
    let spotifyUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    let headers: Headers = {
        'Content-Type': 'application/json',
        'Authorization': await auth.getAuthHeaderEntry(userId)
    }

    let reqConfig = {
        'headers': headers
    };


    let offset = 0;
    let snapshotId: string | null = null;
    let end: number = 0;

    try {

        do {
            end = Math.min(offset + 100, trackUris.length);
            let reqBody = { uris: trackUris.slice(offset, end) };

            let response = await axios.post(spotifyUrl, reqBody, reqConfig);
            snapshotId = response!.data.snapshot_id;
        } while (end !== trackUris.length);

        return snapshotId;
    }
    catch (e) {
        functions.logger.error(e);
        return Promise.reject(e);
    }
}