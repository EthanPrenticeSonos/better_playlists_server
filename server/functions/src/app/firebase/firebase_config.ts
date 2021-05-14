import { Firestore } from '@google-cloud/firestore';
import * as admin from 'firebase-admin';

import * as util from '../util/util';


const PROJECT_ID = 'betterplaylists-f5b1f';


export let firestore: Firestore
if (util.isLocal) {
    var serviceAccount = require("../../../betterplaylists-f5b1f-firebase-adminsdk-b37df-fabea8905e.json");
    admin.initializeApp({
        'credential': admin.credential.cert(serviceAccount)
    });
    firestore = admin.firestore();
}
else {
    admin.initializeApp();
    firestore = new Firestore({
      'projectId': PROJECT_ID,
      'timestampsInSnapshots': true,
    });
}
