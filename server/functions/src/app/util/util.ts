import { Headers } from '../adt/headers';

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


export function convertDateToUtc(date: Date): Date {
    return new Date(
        date.getUTCFullYear(), 
        date.getUTCMonth(),
        date.getUTCDate(), 
        date.getUTCHours(), 
        date.getUTCMinutes(), 
        date.getUTCSeconds()
    );
}; 