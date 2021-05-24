import { Firestore } from '@google-cloud/firestore';
import * as admin from 'firebase-admin';


const PROJECT_ID = 'betterplaylists-f5b1f';


admin.initializeApp();
export let firestore: Firestore = new Firestore({
    'projectId': PROJECT_ID,
    'timestampsInSnapshots': true,
});
