import { expect } from 'chai';
import { Playlist } from '../../app/firebase/adt/music/playlist';
import { GraphDocument } from '../../app/playlist_managment/adt/graph_document';
import * as playlistGraphFirestore from '../../app/playlist_managment/firestore/playlist_graph';


const SERVICE = 'spotify';
const USER_ID = 'graph_tester';

describe("Playlist Graph Firestore Operations", () => {

    describe("Document creation & clearing", () => {

        it("Basic creation & fetching", async() => {
            let graphDocument: GraphDocument = {
                playlists: {
                    playlist_a: {
                        data: {
                            id: 'playlist_a',
                            name: 'Playlist A',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: [],
                        parents: [
                            {
                                id: 'playlist_b',
                                after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                            }
                        ]
                    },
    
                    playlist_b: {
                        data: {
                            id: 'playlist_b',
                            name: 'Playlist B',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: ['playlist_a'],
                        parents: [
                            {
                                id: 'playlist_d',
                                after_date: new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))
                            }
                        ]
                    },
    
                    playlist_c: {
                        data: {
                            id: 'playlist_c',
                            name: 'Playlist C',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: [],
                        parents: [
                            {
                                id: 'playlist_d',
                                after_date: new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))
                            }
                        ]
                    },
    
                    playlist_d: {
                        data: {
                            id: 'playlist_d',
                            name: 'Playlist D',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: ['playlist_b', 'playlist_c'],
                        parents: []
                    },
                }
            }
    
            // put in Firestore
            await playlistGraphFirestore.putPlaylistGraphDocument(SERVICE, USER_ID, graphDocument);
            
            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            expect(fetchedDoc === graphDocument);
        });


        it("Document clearing", async() => {
    
            // clear previous test
            await playlistGraphFirestore.clearPlaylistGraphDocument(SERVICE, USER_ID);
            
            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            // expect empty
            expect(fetchedDoc === {'playlists': {}});
        });

    });


    describe("Adding & removing playlists", () => {
        it("Add playlist", async() => {
            let playlist: Playlist = {
                id: 'test_playlist_add',
                name: 'Test Playlist Add',
                tracks: [],
                can_edit: false
            }

            await playlistGraphFirestore.addPlaylistToGraph(SERVICE, USER_ID, playlist);

            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            let expected: GraphDocument = {
                playlists: {
                    'test_playlist_add': {
                        data: playlist,
                        children_ids: [],
                        parents: []
                    }
                }
            }

            // expect a single playlist
            expect(fetchedDoc === expected);
        });

        it("Add pre-existing playlist", async() => {
            let playlist: Playlist = {
                id: 'test_playlist_add',
                name: 'Test Playlist Add',
                tracks: [],
                can_edit: false
            }

            try {
                await playlistGraphFirestore.addPlaylistToGraph(SERVICE, USER_ID, playlist);
            }
            catch (e) {
                expect(e === {
                    "status": 409,
                    "error": "Playlist already exists in graph!"
                });
            }
        });

        it("Remove playlist", async() => {
            await playlistGraphFirestore.removePlaylistFromGraph(SERVICE, USER_ID, 'test_playlist_add');

            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            let expected: GraphDocument = {
                playlists: { }
            }

            // expect a single playlist
            expect(fetchedDoc === expected);
        });


        it("Remove non-existent playlist", async() => {
            await playlistGraphFirestore.removePlaylistFromGraph(SERVICE, USER_ID, 'test_playlist_add');

            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            let expected: GraphDocument = {
                playlists: { }
            }

            // expect a single playlist
            expect(fetchedDoc === expected);
        });
    });

    describe("Updating Edges", () => {
        it("Update edge dates", async () => {
            let graphDocument: GraphDocument = {
                playlists: {
                    playlist_a: {
                        data: {
                            id: 'playlist_a',
                            name: 'Playlist A',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: [],
                        parents: [
                            {
                                id: 'playlist_b',
                                after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                            }
                        ]
                    },
    
                    playlist_b: {
                        data: {
                            id: 'playlist_b',
                            name: 'Playlist B',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: ['playlist_a'],
                        parents: [
                            {
                                id: 'playlist_d',
                                after_date: new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))
                            }
                        ]
                    },
    
                    playlist_c: {
                        data: {
                            id: 'playlist_c',
                            name: 'Playlist C',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: [],
                        parents: [
                            {
                                id: 'playlist_d',
                                after_date: new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))
                            }
                        ]
                    },
    
                    playlist_d: {
                        data: {
                            id: 'playlist_d',
                            name: 'Playlist D',
                            tracks: [],
                            can_edit: true
                        },
                        children_ids: ['playlist_b', 'playlist_c'],
                        parents: []
                    },
                }
            }
    
            try {
                // put in Firestore
                await playlistGraphFirestore.putPlaylistGraphDocument(SERVICE, USER_ID, graphDocument);
            }
            catch (e) {
                expect.fail("Could not properly put a document before testing edge updating!");
            }

            let currDate = new Date();
            await playlistGraphFirestore.updateGraphEdgeDates(SERVICE, USER_ID, currDate);

            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            // make sure dates match the passed in date
            Object.keys(fetchedDoc.playlists).forEach(playlistId => {
                return fetchedDoc.playlists[playlistId].parents.forEach(parentEdge => {
                    return expect(parentEdge.after_date == currDate);
                });
            });
        });
    });

});