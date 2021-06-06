import * as express from 'express';
import * as functions from 'firebase-functions';
import { parseResponseError, ResponseError } from '../../../adt/error/response_error';

import { GraphDocument } from '../../../playlist_managment/adt/graph_document';
import { PlaylistGraph } from '../../../playlist_managment/adt/playlist_graph/playlist_graph';
import * as playlistMgmtFirestore from '../../../playlist_managment/firestore/playlist_graph';
import * as playlistUpdater from '../playlist_management/update_playlists';


async function getUserPlaylistGraph(req: express.Request, res: express.Response) {
    let serviceName = "spotify";
    let userId = req.get('spotify_id')!;

    try {
        let graph = await playlistMgmtFirestore.getPlaylistGraphDocument(serviceName, userId);
        res.status(200).send(graph);
    }
    catch (e) {
        let resError = parseResponseError(e);
        res.status(resError.status_code).send(resError);

        if (e.response) {
            functions.logger.error('Error getting Spotify user\'s playlist graph', e.response?.data);
        }
        else {
            functions.logger.error('Error getting Spotify user\'s playlist graph', e);
        }
    }
}


async function putUserPlaylistGraph(req: express.Request, res: express.Response) {
    let serviceName = "spotify";
    let userId = req.get('spotify_id')!;

    let graphDocument: GraphDocument;
    try {
        functions.logger.debug("Req body graph document", req.body);

        for (let playlistId in req.body) {
            for (let edge = 0; edge < req.body[playlistId].parents.length; ++edge) {
                let afterDateIsoString = req.body[playlistId].parents[edge].after_date;
                let parsedDate = new Date(Date.parse(afterDateIsoString));
                req.body[playlistId].parents[edge].after_date = parsedDate;
            }
        }

        graphDocument = req.body;

        // Ensure the graph document is valid
        let nonMatchingRelationships = !PlaylistGraph.hasValidRelationships(graphDocument);
        let hasDupes = PlaylistGraph.hasDuplicateEdges(graphDocument)
        let hasCycle = PlaylistGraph.hasCycle(graphDocument)
        if (nonMatchingRelationships || hasDupes || hasCycle) {
            let resError: ResponseError = {
                status_code: 400,
                error: 'malformed_graph',
                message_type: 'string',
                message: ''
            }

            let messages = [];
            if (nonMatchingRelationships) {
                messages.push('Has non-matching relationships');
            }
            if (hasDupes) {
                messages.push('Has duplicate edges');
            }
            if (hasCycle) {
                messages.push('Has Cycle');
            }

            resError.message = messages.join(', ');

            res.status(resError.status_code).send(resError);
            return;
        }


        functions.logger.debug("Putting graph document", graphDocument);

        try {
            await playlistMgmtFirestore.putPlaylistGraphDocument(serviceName, userId, graphDocument);
            res.status(200).send();
        }
        catch(e) {
            let resError = parseResponseError(e);
            res.status(resError.status_code).send(resError);
    
            if (e.response) {
                functions.logger.error('Error putting Spotify user\'s playlist graph', e.response?.data);
            }
            else {
                functions.logger.error('Error putting Spotify user\'s playlist graph', e);
            }
        }        
    }
    catch (e) {
        let resError: ResponseError = {
            status_code: 400,
            error: 'malformed_graph',
            message_type: 'string',
            message: 'Make sure that the graph document sent in the body is the correct format'
        }
        res.status(resError.status_code).send(resError);

        if (e.response) {
            functions.logger.error('Error putting Spotify user\'s playlist graph', e.response?.data);
        }
        else {
            functions.logger.error('Error putting Spotify user\'s playlist graph', e);
        }
    }
}

async function executeGraphUpdates(req: express.Request, res: express.Response) {
    let userId = req.get('spotify_id')!;

    try {
        await playlistUpdater.executeGraphUpdates(userId);
        res.status(200).send();
    }
    catch (e) {
        let resError = parseResponseError(e);
        res.status(resError.status_code).send(resError);

        if (e.response) {
            functions.logger.error('Error updating Spotify user\'s playlists', e.response?.data);
        }
        else {
            functions.logger.error('Error updating Spotify user\'s playlists', e);
        }
    }
}


export const router = express.Router({'mergeParams': true});

router.route('/playlistGraph')
    .get(getUserPlaylistGraph)
    .put(putUserPlaylistGraph);

router.get('/executeUpdates', executeGraphUpdates);