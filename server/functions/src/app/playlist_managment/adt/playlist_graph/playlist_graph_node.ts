import { Playlist } from "../../../firebase/adt/music/playlist";

export class PlaylistGraphNode {

    playlist: Playlist;

    parents: {
        node: PlaylistGraphNode,
        after_date: Date
    }[];

    children: PlaylistGraphNode[];

    constructor(playlist: Playlist, parents: { node: PlaylistGraphNode, after_date: Date }[], children: PlaylistGraphNode[]) {
        this.playlist = playlist;
        this.parents = parents;
        this.children = children;
    }
}