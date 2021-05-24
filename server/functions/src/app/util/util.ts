import { URL } from 'url';
import { networkInterfaces } from 'os';

import * as config from '../config';
import { Headers } from '../adt/routing/headers';


export function getProxyUrl(url: URL, changeToPath: string): URL {
    // no leading slash
    if (changeToPath.charAt(0) === '/') {
        changeToPath = changeToPath.substr(1);
    }

    // 10.2.2.2 is the Android emulator's local machine localhost pass-through
    if (process.env.FUNCTIONS_EMULATOR! === "true") {
        let lanIp = networkInterfaces()['Ethernet'][1]['address'];

        url.protocol = 'http'; // firebase emulator only supports http
        url.host = lanIp;
        url.port = config.EMULATOR_PORT.toString();
        url.pathname = 'betterplaylists-f5b1f/us-central1/app/' + changeToPath;
    }
    else {
        url.protocol = 'https'; // always use http for proxies in prod
        url.host = config.hostUrl;
        url.pathname = changeToPath;
    }
    return url;
}


export function filterHeaders(headers: Headers): Headers {
    var keyList = [
        'content-type',
        'authorization'
    ]

    for (let key in headers) {
        if (!keyList.includes(key.toLowerCase())) {
            delete headers[key];
        }
    }

    return headers;
};