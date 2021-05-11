import { SpotifyAuth } from "./spotify_auth";

 export interface SpotifyUserAuth {
    user_id: string;
    auth: SpotifyAuth;
};