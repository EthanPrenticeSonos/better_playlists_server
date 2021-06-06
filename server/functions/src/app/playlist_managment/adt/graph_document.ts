import { PlaylistRef } from "../../firebase/adt/music/playlist";

export interface GraphDocument {
    [playlistId: string]: GraphNodeDocument
}

export interface GraphNodeDocument {
    is_root?: boolean,
    playlist_ref: PlaylistRef;
    children: string[];
    parents: {
        id: string,
        after_date: Date
    }[];
}