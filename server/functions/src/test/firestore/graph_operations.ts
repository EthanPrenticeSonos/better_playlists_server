import { expect } from 'chai';
import { PlaylistRef } from '../../app/firebase/adt/music/playlist';
import { GraphDocument } from '../../app/playlist_managment/adt/graph_document';
import * as playlistGraphFirestore from '../../app/playlist_managment/firestore/playlist_graph';


const SERVICE = 'spotify';
const USER_ID = 'graph_tester';

describe("Playlist Graph Firestore Operations", () => {

    describe("Document creation & clearing", () => {

        it("Basic creation & fetching", async() => {
            let graphDocument: GraphDocument = {
                playlist_a: {
                    playlist_ref: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        can_edit: true
                    },
                    children: [],
                    parents: [
                        {
                            id: 'playlist_b',
                            after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                        }
                    ]
                },
    
                playlist_b: {
                    playlist_ref: {
                        id: 'playlist_b',
                        name: 'Playlist B',
                        can_edit: true
                    },
                    children: ['playlist_a'],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))
                        }
                    ]
                },
    
                playlist_c: {
                    playlist_ref: {
                        id: 'playlist_c',
                        name: 'Playlist C',
                        can_edit: true
                    },
                    children: [],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))
                        }
                    ]
                },
    
                playlist_d: {
                    playlist_ref: {
                        id: 'playlist_d',
                        name: 'Playlist D',
                        can_edit: true
                    },
                    children: ['playlist_b', 'playlist_c'],
                    parents: [],
                    is_root: true
                },
            }
    
            // put in Firestore
            await playlistGraphFirestore.putPlaylistGraphDocument(SERVICE, USER_ID, graphDocument);
            
            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            expect(fetchedDoc).to.eql(graphDocument);
        });


        it("Document clearing", async() => {
    
            // clear previous test
            await playlistGraphFirestore.clearPlaylistGraphDocument(SERVICE, USER_ID);
            
            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            // expect empty
            expect(fetchedDoc).to.eql({'graph': {}});
        });

    });


    describe("Adding & removing playlists", () => {
        it("Add playlist", async() => {
            let playlistRef: PlaylistRef = {
                id: 'test_playlist_add',
                name: 'Test Playlist Add',
                can_edit: false
            }

            await playlistGraphFirestore.addPlaylistToGraph(SERVICE, USER_ID, playlistRef);

            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            let expected: GraphDocument = {
                'test_playlist_add': {
                    playlist_ref: playlistRef,
                    children: [],
                    parents: []
                }
            }

            // expect a single playlist
            expect(fetchedDoc).to.eql(expected);
        });

        it("Add pre-existing playlist", async() => {
            let playlistRef: PlaylistRef = {
                id: 'test_playlist_add',
                name: 'Test Playlist Add',
                can_edit: false
            }

            try {
                await playlistGraphFirestore.addPlaylistToGraph(SERVICE, USER_ID, playlistRef);
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
            
            let expected: GraphDocument = { };

            // expect a single playlist
            expect(fetchedDoc).to.eql(expected);
        });


        it("Remove non-existent playlist", async() => {
            await playlistGraphFirestore.removePlaylistFromGraph(SERVICE, USER_ID, 'test_playlist_add');

            // get from Firestore
            let fetchedDoc = await playlistGraphFirestore.getPlaylistGraphDocument(SERVICE, USER_ID);
            
            let expected: GraphDocument = { };

            // expect a single playlist
            expect(fetchedDoc).to.eql(expected);
        });
    });

    describe("Updating Edges", () => {
        it("Update edge dates", async () => {
            let graphDocument: GraphDocument = {
                playlist_a: {
                    playlist_ref: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        can_edit: true
                    },
                    children: [],
                    parents: [
                        {
                            id: 'playlist_b',
                            after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                        }
                    ]
                },
    
                playlist_b: {
                    playlist_ref: {
                        id: 'playlist_b',
                        name: 'Playlist B',
                        can_edit: true
                    },
                    children: ['playlist_a'],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))
                        }
                    ]
                },
    
                playlist_c: {
                    playlist_ref: {
                        id: 'playlist_c',
                        name: 'Playlist C',
                        can_edit: true
                    },
                    children: [],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))
                        }
                    ]
                },
    
                playlist_d: {
                    playlist_ref: {
                        id: 'playlist_d',
                        name: 'Playlist D',
                        can_edit: true
                    },
                    children: ['playlist_b', 'playlist_c'],
                    parents: [],
                    is_root: true
                },
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
            Object.keys(fetchedDoc).forEach(playlistId => {
                fetchedDoc[playlistId].parents.forEach(parentEdge => {
                    expect(parentEdge.after_date).to.eql(currDate);
                });
            });

        });
    });

});