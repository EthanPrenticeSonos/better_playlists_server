import { Timestamp, WriteResult } from '@google-cloud/firestore';
import { Playlist } from '../../firebase/adt/music/playlist';
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

        if (docSnap.exists && docSnap.get('playlists')) {
            let graphDoc: GraphDocument = {'playlists': docSnap.get('playlists')};

            // convert Timestamp to Date
            for (let playlistId in graphDoc.playlists) {
                for (let edge of graphDoc.playlists[playlistId].parents.keys()) {
                    let date = (graphDoc.playlists[playlistId].parents[edge].after_date as unknown as Timestamp).toDate();
                    graphDoc.playlists[playlistId].parents[edge].after_date = date;
                }
            }

            return graphDoc;
        }
        else {
            return Promise.reject({
                status: 404,
                error: "User does not exist or document is malformed (missing playlists)"
            });
        }
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function putPlaylistGraphDocument(service: string, userId: string, graphDoc: GraphDocument): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    try {
        return await firestore.collection(collectionName).doc(userId).set({
            'playlists': graphDoc.playlists
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
            'playlists': {}
        }, { merge: true });
    }
    catch (e) {
        return Promise.reject(e);
    }
}


export async function addPlaylistToGraph(service: string, userId: string, playlist: Playlist): Promise<WriteResult> {
    return addPlaylistsToGraph(service, userId, [playlist]);
}

export async function addPlaylistsToGraph(service: string, userId: string, playlists: Playlist[]): Promise<WriteResult> {
    let collectionName = serviceCollectionMap[service];

    try {
        let doc = firestore.collection(collectionName).doc(userId);
        let graphDocument = await getPlaylistGraphDocument(service, userId);

        for (let playlist of playlists) {
            if (graphDocument.playlists[playlist.id]) {
                return Promise.reject({
                    'status': 409,
                    'error': 'Playlist already exists in graph!'
                });
            }
    
            let newNode: GraphNodeDocument = {
                data: playlist,
                children_ids: [],
                parents: []
            }

            graphDocument.playlists[playlist.id] = newNode;
        }

        return await doc.set({
            'playlists': graphDocument.playlists
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
            if (!graphDoc.playlists[deleteId]) {
                continue;
            }

            // delete node
            delete graphDoc.playlists[deleteId];

            // delete associations
            for (let playlistId in graphDoc.playlists) {
                let parentEdges = graphDoc.playlists[playlistId].parents;
                parentEdges = parentEdges.filter(edge => edge.id !== deleteId);
                graphDoc.playlists[playlistId].parents = parentEdges;

                let childEdges = graphDoc.playlists[playlistId].children_ids;
                childEdges = childEdges.filter(edge => edge !== deleteId);
                graphDoc.playlists[playlistId].children_ids = childEdges;
            }
        }

        let doc = firestore.collection(collectionName).doc(userId);

        return doc.update({
            playlists: graphDoc.playlists  
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

        for (let playlistId in graphDoc.playlists) {
            for (let edge of graphDoc.playlists[playlistId].parents.keys()) {
                graphDoc.playlists[playlistId].parents[edge].after_date = date;
            }
        }

        let doc = firestore.collection(collectionName).doc(userId);

        return doc.update({
            playlists: graphDoc.playlists
        });
    }
    catch (e) {
        return Promise.reject(e);
    }
}
