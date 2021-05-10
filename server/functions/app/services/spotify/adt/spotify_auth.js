const Timestamp = require('firebase-admin').firestore.Timestamp;

/**
 * Manages auth variables for Spotify api calls and storing in Firebase
 * Uses underscore rather than camel-case for the values to meet Spotify convention
 */
module.exports = class SpotifyAuth {

    constructor(accessToken, refreshToken, expiresAt, scopes) {
        // all values other than scopes must be defined and non-null
        if (!accessToken || !refreshToken || !expiresAt) {
            throw "SpotifyAuth: all values other than scopes must be defined and non-null";
        }

            // expiresAt must be a Date or a Firestore Timestamp
        if (!(accessToken instanceof String || typeof(accessToken) === 'string')
            || !(refreshToken instanceof String || typeof(refreshToken) === 'string')) {
                throw "SpotifyAuth: aokens must be strings!";
        }

        this.access_token = accessToken;
        this.refresh_token = refreshToken;

        // expiresAt must be a Date or a Firestore Timestamp
        if (expiresAt instanceof Timestamp) {
            this.expires_at = expiresAt.toDate();
        }
        else if (expiresAt instanceof Date) {
            this.expires_at = expiresAt;
        }
        else {
            throw "SpotifyAuth: expiresAt must be a Date or a Firestore Timestamp!";
        }

        this.scopes = scopes;
    }

    toPlain() {
        var plainObj = {
            'access_token': this.access_token,
            'refresh_token': this.refresh_token,
            'expires_at': this.expires_at
        }
        if (this.scopes != undefined) {
            plainObj.scopes = this.scopes;
        }

        return plainObj;
    }

};