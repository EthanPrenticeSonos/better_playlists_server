import * as express from 'express';
import * as functions from 'firebase-functions';

import { GraphDocument } from '../../../playlist_managment/adt/graph_document';
import * as playlistMgmtFirestore from '../../../playlist_managment/firestore/playlist_graph';



async function getUserPlaylistGraph(req: express.Request, res: express.Response) {
    let serviceName = "spotify";
    let userId = req.get('spotify_id')!;

    try {
        let graph = await playlistMgmtFirestore.getPlaylistGraphDocument(serviceName, userId);
        res.status(200).send(graph);
    }
    catch (e) {
        functions.logger.error('Error getting Spotify user\'s playlist graph', e);

        if (e.response) {
            res.status(e.response.status);
            res.send(e.response.data);
        }
        else if (e.status) {
            res.status(e.status).send(e);
        }
        else {
            res.status(502).send(e);
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

        functions.logger.debug("Putting graph document", graphDocument);

        try {
            await playlistMgmtFirestore.putPlaylistGraphDocument(serviceName, userId, graphDocument);
            res.status(200).send();
        }
        catch(e) {
            functions.logger.error('Error putting Spotify user\'s playlist graph', e);

            if (e.response) {
                res.status(e.response.status);
                res.send(e.response.data);
            }
            else if (e.status) {
                res.status(e.status).send(e);
            }
            else {
                res.status(502).send(e);
            }
        }        
    }
    catch (e) {
        res.status(404).send({
            'status': 404,
            'error': 'Malformed graph document'
        });
    }

   
}


export const router = express.Router({'mergeParams': true});

router.route('/playlistGraph')
    .get(getUserPlaylistGraph)
    .put(putUserPlaylistGraph);