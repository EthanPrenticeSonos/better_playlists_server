import { WriteResult } from '@google-cloud/firestore';
import * as express from 'express';

import { GraphDocument } from '../../../playlist_managment/adt/graph_document';
import * as playlistMgmtFirestore from '../../../playlist_managment/firestore/playlist_graph';



async function getUserPlaylistGraph(req: express.Request, res: express.Response): Promise<GraphDocument> {
    let serviceName = "spotify";
    let userId = req.get('spotify_id')!;

    return playlistMgmtFirestore.getPlaylistGraphDocument(serviceName, userId);
}


async function putUserPlaylistGraph(req: express.Request, res: express.Response): Promise<WriteResult> {
    let serviceName = "spotify";
    let userId = req.get('spotify_id')!;

    let graphDocument: GraphDocument;
    try {
        graphDocument = req.body;
    }
    catch (e) {
        return Promise.reject({
            'status': 404,
            'error': 'Malformed graph document'
        });
    }

    return playlistMgmtFirestore.putPlaylistGraphDocument(serviceName, userId, graphDocument);
}


export let router = express.Router({'mergeParams': true});

// Covers authorization & authentication
router.route('/playlistGraph')
    .get(getUserPlaylistGraph)
    .put(putUserPlaylistGraph);