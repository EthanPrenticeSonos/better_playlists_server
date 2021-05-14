import { Playlist } from "./playlist";

export interface PlaylistTrack {
    id: string;
    name: string;

    date_added: Date;

    // either the playlist it was added from, or null/undefined
    origin?: Playlist;
}