import { PlaylistRef } from "../../../firebase/adt/music/playlist";

export class PlaylistGraphNode {

    playlist_ref: PlaylistRef;

    parents: {
        node: PlaylistGraphNode,
        after_date: Date
    }[];

    children: PlaylistGraphNode[];

    constructor(playlist_ref: PlaylistRef, parents: { node: PlaylistGraphNode, after_date: Date }[], children: PlaylistGraphNode[]) {
        this.playlist_ref = playlist_ref;
        this.parents = parents;
        this.children = children;
    }
}