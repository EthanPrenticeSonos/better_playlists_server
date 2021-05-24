import { Timestamp, WriteResult } from '@google-cloud/firestore';
import { PlaylistRef } from '../../firebase/adt/music/playlist';
import { firestore } from '../../firebase/firebase_config';
import { GraphDocument, GraphNodeDocument } from '../adt/graph_document';
import { PlaylistGraph } from '../adt/playlist_graph/playlist_graph';


const serviceCollectionMap: {[key: string]: string} = {
    spotify: 'spotify_users'
};


export async function getPlaylistGraph(service: string, userId: string): Promise<PlaylistGraph|null> {
    try {
        let graphDocument = await getPlaylistGraphDocument(service, userId);
        return new PlaylistGraph(graphDocument);
    }
    catch (e) {
        if (e === "Cannot build graph - document contains cycles!") {
            return null;
        }
        else {
            return Promise.reject(e);
        }
    }
}


export async function getPlaylistGraphDocument(service: string, userId: string): Promise<GraphDocument> {
    let collectionName = serviceCollectionMap[service];

    try {
        let docSnap = await firestore.collection(collectionName).doc(userId).get();

        if (docSnap.exists && docSnap.get('graph')) {
            let graphDoc: GraphDocument = docSnap.get('graph');

            // convert Timestamp to Date
            for (let playlistId in graphDoc) {
                for (let edge = 0; edge < graphDoc[playlistId].parents.length; ++edge) {
                    let date = (graphDoc[playlistId].parents[edge].after_date as unknown as Timestamp).toDate();
                    graphDoc[playlistId].parents[edge].after_date = date;
                }
            }

            return graphDoc;
        }
        else {
            if (!docSnap.exists) {
                return Promise.reject({
                    status: 404,
                    error: "User does not exist"
                });
            }
            else {
                return Promise.reject({
                    status: 404,
                    error: "User document is malformed.  (Missing 'graph')"
                });
            }

        }
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function putPlaylistGraphDocument(service: string, userId: string, graphDoc: GraphDocument): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    console.log(graphDoc);

    try {
        return await firestore.collection(collectionName).doc(userId).set({
            'graph': graphDoc
        }, { merge: true });
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function clearPlaylistGraphDocument(service: string, userId: string): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    try {
        return await firestore.collection(collectionName).doc(userId).set({
            'graph': {}
        }, { merge: true });
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function addPlaylistToGraph(service: string, userId: string, playlistRef: PlaylistRef): Promise<WriteResult> {
    return addPlaylistsToGraph(service, userId, [playlistRef]);
}

export async function addPlaylistsToGraph(service: string, userId: string, playlistRefs: PlaylistRef[]): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    try {
        let doc = firestore.collection(collectionName).doc(userId);
        let graphDocument = await getPlaylistGraphDocument(service, userId);

        for (let playlistRef of playlistRefs) {
            if (graphDocument[playlistRef.id]) {
                return Promise.reject({
                    'status': 409,
                    'error': 'Playlist already exists in graph!'
                });
            }
    
            let newNode: GraphNodeDocument = {
                playlist_ref: playlistRef,
                children_ids: [],
                parents: []
            }

            graphDocument[playlistRef.id] = newNode;
        }

        return await doc.set({
            'graph': graphDocument
        }, { merge: true });
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function removePlaylistFromGraph(service: string, userId: string, deleteId: string): Promise<WriteResult> {
    return removePlaylistsFromGraph(service, userId, [deleteId]);
}

export async function removePlaylistsFromGraph(service: string, userId: string, deleteIds: string[]): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    try {
        let graphDoc: GraphDocument = await getPlaylistGraphDocument(service, userId);

        for (let deleteId of deleteIds) {

            // playlist does not exist in the graph
            if (!graphDoc[deleteId]) {
                continue;
            }

            // delete node
            delete graphDoc[deleteId];

            // delete associations
            for (let playlistId in graphDoc) {
                let parentEdges = graphDoc[playlistId].parents;
                parentEdges = parentEdges.filter(edge => edge.id !== deleteId);
                graphDoc[playlistId].parents = parentEdges;

                let childEdges = graphDoc[playlistId].children_ids;
                childEdges = childEdges.filter(edge => edge !== deleteId);
                graphDoc[playlistId].children_ids = childEdges;
            }
        }

        let doc = firestore.collection(collectionName).doc(userId);

        return doc.update({
            'graph': graphDoc  
        });
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function updateGraphEdgeDates(service: string, userId: string, date: Date): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    try {
        let graphDoc: GraphDocument = await getPlaylistGraphDocument(service, userId);

        for (let playlistId in graphDoc) {
            for (let edge = 0; edge < graphDoc[playlistId].parents.length; ++edge) {
                graphDoc[playlistId].parents[edge].after_date = date;
            }
        }

        let doc = firestore.collection(collectionName).doc(userId);

        return doc.update({
            'graph': graphDoc
        });
    }
    catch (e) {
        return Promise.reject(e);
    }
}
