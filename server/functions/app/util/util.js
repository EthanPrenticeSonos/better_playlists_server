

var isLocal = false;
process.argv.forEach(function (val, index, array) {
    if (val === '--local') {
        isLocal = true;
        return;
    }
});

module.exports.isLocal = isLocal;

module.exports.filterHeaders = (headers) => {
    var keyList = [
        'content-type',
        'authorization'
    ]
    var returnObj = {};

    for (let key in headers) {
        if (keyList.includes(key.toLowerCase())) {
            returnObj[key] = headers[key];
        }
    }

    return returnObj;
};


module.exports.convertDateToUtc = (date) => new Date(
    date.getUTCFullYear(), 
    date.getUTCMonth(),
    date.getUTCDate(), 
    date.getUTCHours(), 
    date.getUTCMinutes(), 
    date.getUTCSeconds()
); 