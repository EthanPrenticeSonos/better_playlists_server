import { PlaylistTrack } from "./playlist_track";

export interface Playlist {
    // Hold everything we need to do operations on tracks
    id: string;
    name: string;
    tracks: PlaylistTrack[];

    can_edit: boolean;
}