import { Playlist } from "../music/playlist";

export interface GraphDocument {
    playlists: {
        [playlistId: string]: GraphNodeDocument
    }
}

export interface GraphNodeDocument {
    data: Playlist;
    children_ids: string[];
    parents: {
        id: string,
        after_date: Date
    }[];
}