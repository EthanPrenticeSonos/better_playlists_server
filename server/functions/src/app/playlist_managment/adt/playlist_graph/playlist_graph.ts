import * as functions from 'firebase-functions';

import { GraphDocument, GraphNodeDocument } from "../graph_document";
import { PlaylistOperation } from "../operations/playlist_operation";
import { PlaylistGraphNode } from "./playlist_graph_node";

/**
 * Can be disconnected, so store multiple roots
 */
export class PlaylistGraph {

    nodeMap: {
        [playlistId: string]: PlaylistGraphNode
    } = {};

    constructor(graphDocument: GraphDocument) {

        if (PlaylistGraph.hasCycle(graphDocument)) {
            throw "Cannot build graph - document contains cycles!";
        }

        for (let playlistId in graphDocument) {

            // generate new subgraph as we haven't visited this node yet
            // then add it to the root nodes
            if (!this.nodeMap[playlistId]) {
                this.nodeDocumentToNode(
                    graphDocument, 
                    graphDocument[playlistId]
                );
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
            if (computedPlaylists.has(this.nodeMap[playlistId].playlist_ref.id)) {
                continue;
            }

            nodeStack.push(this.nodeMap[playlistId]);
            
            while (nodeStack.length != 0) {

                let node = nodeStack[nodeStack.length - 1];

                if (node.children.length > 0 && !processedChildren.has(node.playlist_ref.id)) {
                    for (let child of node.children) {
                        nodeStack.push(child);
                    }
                    processedChildren.add(node.playlist_ref.id);
                }
                else {
                    nodeStack.pop();

                    // if already visited, don't visit again
                    if (computedPlaylists.has(node.playlist_ref.id)) {
                        continue;
                    }
                    computedPlaylists.add(node.playlist_ref.id);

                    for (let parent of node.parents) {
                        operations.push({
                            source_id: node.playlist_ref.id,
                            dest_id: parent.node.playlist_ref.id,
                            after_date: parent.after_date
                        });
                    }
                    
                }
            }
        }
        return operations;
    }

    static hasCycle(graphDocument: GraphDocument): boolean {

        function hasCycleUtil(node: GraphNodeDocument, visited: Set<string>, recIds: Set<string>) {
            if (!visited.has(node.playlist_ref.id)) {
                visited.add(node.playlist_ref.id);
                recIds.add(node.playlist_ref.id);

                functions.logger.log(node);

                for (let childId of node.children) {
                    if (!visited.has(childId) && hasCycleUtil(graphDocument[childId], visited, recIds)) {
                        return true;
                    }
                    else if (recIds.has(childId)) {
                        return true;
                    }
                }
            }
            recIds.delete(node.playlist_ref.id);
            return false;
        }

        let visitedIds = new Set<string>();
        let recursionIds = new Set<string>();

        for (let playlistId in graphDocument) {
            if (hasCycleUtil(graphDocument[playlistId], visitedIds, recursionIds)) {
                return true;
            }
        }

        return false;
    }

    static hasDuplicateEdges(graphDocument: GraphDocument): boolean {
        let pairSet = new Set<string>();
        for (let playlistId in graphDocument) {
            for (let childId of graphDocument[playlistId].children) {
                if (pairSet.has(`${playlistId}:${childId}`)) {
                    return true;
                }
                pairSet.add(`${playlistId}:${childId}`);
            }
        }

        return false;
    }

    static hasValidRelationships(graphDocument: GraphDocument): boolean {
        let idSets: {[pid: string]: {children: Set<string>, parents: Set<string>}} = {};
        for (let playlistId in graphDocument) {
            idSets[playlistId] = {
                children: new Set(graphDocument[playlistId].children),
                parents: new Set(graphDocument[playlistId].parents.map((x) => x.id))
            };
        }

        for (let playlistId in graphDocument) {
            for (let parentEdge of graphDocument[playlistId].parents) {
                if (!idSets[parentEdge.id].children.has(playlistId)) {
                    return false;
                }
            }

            for (let childId of graphDocument[playlistId].children) {
                if (!idSets[childId].parents.has(playlistId)) {
                    return false;
                }
            }
        }

        return true;
    }

    nodeDocumentToNode(graphDocument: GraphDocument, node: GraphNodeDocument): PlaylistGraphNode {
        let parents = node.parents.map(parent => graphDocument[parent.id]);
        let parentNodes: PlaylistGraphNode[] = [];

        let parentEdges: {[playlistId: string]: Date} = {};
        for (let p of node.parents) {
            parentEdges[p.id] = p.after_date;
        }
        
        for (let parent of parents) {
            if (this.nodeMap[parent.playlist_ref.id]) { // add cached node
                parentNodes.push(this.nodeMap[parent.playlist_ref.id]);
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
                after_date: parentEdges[p.playlist_ref.id]
            });
        }

        let newNode = new PlaylistGraphNode(node.playlist_ref, parentNodeEdges, []);

        for (let parent of parents) {
            this.nodeMap[parent.playlist_ref.id].children.push(newNode);
        }

        this.nodeMap[node.playlist_ref.id] = newNode;
        return newNode;
    }
}