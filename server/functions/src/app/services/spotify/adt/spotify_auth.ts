/**
 * Manages auth variables for Spotify api calls and storing in Firebase
 * Uses underscore rather than camel-case for the values to meet Spotify convention
 */
export interface SpotifyAuth {
    access_token: string;
    refresh_token: string;
    expires_at: Date;
    scopes?: Array<string>;
};