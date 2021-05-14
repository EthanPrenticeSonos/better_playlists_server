import { Headers } from '../adt/routing/headers';

export let isLocal = false;
process.argv.forEach(function (val, index, array) {
    if (val === '--local') {
        isLocal = true;
        return;
    }
});

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