import * as functions from 'firebase-functions';

import { firestore } from '../../firebase/firebase_config';
import { GraphDocument } from '../adt/graph_document';


const serviceCollectionMap: {[key: string]: string} = {
    spotify: 'spotify_users'
};


export async function getPlaylistGraph(service: string, userId: string) {
    let collectionName = serviceCollectionMap[service];

    let docSnap = await firestore.collection(collectionName).doc(userId).get();

    if (docSnap.get('playlists')) {
        let graphDocument: GraphDocument = {'playlists': docSnap.get('playlists')};
        

    }
}