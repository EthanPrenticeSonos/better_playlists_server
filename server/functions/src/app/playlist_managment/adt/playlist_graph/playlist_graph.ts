import { GraphDocument, GraphNodeDocument } from "../../../firebase/adt/playlist_management/graph_document";
import { PlaylistOperation } from "../operations/playlist_operation";
import { PlaylistOperationType } from "../operations/playlist_operation_type";
import { PlaylistGraphNode } from "./playlist_graph_node";

/**
 * Can be disconnected, so store multiple roots
 */
export class PlaylistGraph {

    nodeMap: {
        [playlistId: string]: PlaylistGraphNode
    } = {};

    rootNodes: PlaylistGraphNode[] = [];

    constructor(graphDocument: GraphDocument) {

        if (this.hasCycle(graphDocument)) {
            throw "Cannot build graph - document contains cycles!";
        }

        for (let playlistId in graphDocument.playlists) {

            // generate new subgraph as we haven't visited this node yet
            // then add it to the root nodes
            if (!this.nodeMap[playlistId]) {

                let rootNode = this.nodeDocumentToNode(
                    graphDocument, 
                    graphDocument.playlists[playlistId]
                );

                this.rootNodes.push(rootNode);
            }
        }
    }


    getOrderOfOperations(): PlaylistOperation[] {
        let computedPlaylists = new Set<string>();
        let processedChildren = new Set<string>();

        let nodeStack: PlaylistGraphNode[] = [];

        let operations: PlaylistOperation[] = [];

        for (let playlistId in this.nodeMap) {

            // don't recalculate already calculated operations
            if (computedPlaylists.has(this.nodeMap[playlistId].playlist.id)) {
                continue;
            }

            nodeStack.push(this.nodeMap[playlistId]);
            
            while (nodeStack.length != 0) {

                let node = nodeStack[nodeStack.length - 1];

                if (node.children.length > 0 && !processedChildren.has(node.playlist.id)) {
                    for (let child of node.children) {
                        nodeStack.push(child);
                    }
                    processedChildren.add(node.playlist.id);
                }
                else {
                    nodeStack.pop();

                    // if already visited, don't visit again
                    if (computedPlaylists.has(node.playlist.id)) {
                        continue;
                    }
                    computedPlaylists.add(node.playlist.id);

                    for (let parent of node.parents) {
                        for (let opType of [PlaylistOperationType.REMOVE, PlaylistOperationType.ADD]) {
                            operations.push({
                                type: opType,
                                source_id: node.playlist.id,
                                dest_id: parent.node.playlist.id,
                                after_date: parent.after_date
                            });
                        }
                    }
                    
                }
            }
        }
        return operations;
    }

    hasCycle(graphDocument: GraphDocument): boolean {

        function hasCycleUtil(node: GraphNodeDocument, visited: Set<string>, recIds: Set<string>) {
            if (!visited.has(node.data.id)) {
                visited.add(node.data.id);
                recIds.add(node.data.id);

                for (let childId of node.children_ids) {
                    if (!visited.has(childId) && hasCycleUtil(graphDocument.playlists[childId], visited, recIds)) {
                        return true;
                    }
                    else if (recIds.has(childId)) {
                        return true;
                    }
                }
            }
            recIds.delete(node.data.id);
            return false;
        }

        let visitedIds = new Set<string>();
        let recursionIds = new Set<string>();

        for (let playlistId in graphDocument.playlists) {
            if (hasCycleUtil(graphDocument.playlists[playlistId], visitedIds, recursionIds)) {
                return true;
            }
        }

        return false;
    }

    nodeDocumentToNode(graphDocument: GraphDocument, node: GraphNodeDocument): PlaylistGraphNode {
        let parents = node.parents.map(parent => graphDocument.playlists[parent.id]);
        let parentNodes: PlaylistGraphNode[] = [];

        let parentEdges: {[playlistId: string]: Date} = {};
        for (let p of node.parents) {
            parentEdges[p.id] = p.after_date;
        }
        
        for (let parent of parents) {
            if (this.nodeMap[parent.data.id]) { // add cached node
                parentNodes.push(this.nodeMap[parent.data.id]);
            }
            else { // calculate new node and cache it
                let playlistGraphNode = this.nodeDocumentToNode(graphDocument, parent);
                parentNodes.push(playlistGraphNode);
            }
            
        }

        let parentNodeEdges: { node: PlaylistGraphNode, after_date: Date }[] = [];
        for (let p of parentNodes) {
            parentNodeEdges.push({
                node: p,
                after_date: parentEdges[p.playlist.id]
            });
        }

        let newNode = new PlaylistGraphNode(node.data, parentNodeEdges, []);

        for (let parent of parents) {
            this.nodeMap[parent.data.id].children.push(newNode);
        }

        this.nodeMap[node.data.id] = newNode;
        return newNode;
    }
}