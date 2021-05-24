/**
 * Manages auth variables for Spotify api calls and storing in Firebase
 * Uses underscore rather than camel-case for the values to meet Spotify convention
 */
export interface SpotifyAuth {
    access_token: string;
    refresh_token: string;
    expires_at: Date;
    scopes: Array<string>;
    // lock the auth data when a refresh request has been sent
    // don't need to lock on auth code request since it is managed client-side
    locked: boolean;
};