import { expect } from 'chai';
import { GraphDocument } from '../../app/playlist_managment/adt/graph_document';
import { PlaylistOperation } from '../../app/playlist_managment/adt/operations/playlist_operation';
import { PlaylistGraph } from '../../app/playlist_managment/adt/playlist_graph/playlist_graph';

describe("Playlist Dependency Graph", () => {

    describe("Getting order of operations", () => {
        it("Basic Dependency Graph", () => {
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
                    parents: []
                },
            }
    
    
            let playlistGraph = new PlaylistGraph(graphDocument);
            let operations = playlistGraph.getOrderOfOperations();
    
            let expected: PlaylistOperation[] = [
                {"source_id":"playlist_c","dest_id":"playlist_d","after_date":new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))},
                {"source_id":"playlist_a","dest_id":"playlist_b","after_date":new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))},
                {"source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))},
            ];
    
            expect(operations === expected);
        });

        it("Advanced Dependency Graph", () => {
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
                            id: 'playlist_d',
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
                    children: [],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))
                        },{
                            id: 'playlist_e',
                            after_date: new Date(Date.parse('01 Jan 1970 4:30:00 GMT'))
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
                            id: 'playlist_e',
                            after_date: new Date(Date.parse('01 Jan 1970 3:10:00 GMT'))
                        }
                    ]
                },
    
                playlist_d: {
                    playlist_ref: {
                        id: 'playlist_d',
                        name: 'Playlist D',
                        can_edit: true
                    },
                    children: ['playlist_a', 'playlist_b'],
                    parents: []
                },
    
                playlist_e: {
                    playlist_ref: {
                        id: 'playlist_e',
                        name: 'Playlist E',
                        can_edit: true
                    },
                    children: ['playlist_b', 'playlist_c'],
                    parents: [
                        {
                            id: 'playlist_f',
                            after_date: new Date(Date.parse('01 Jan 1970 3:10:00 GMT'))
                        }
                    ]
                },
    
                playlist_f: {
                    playlist_ref: {
                        id: 'playlist_f',
                        name: 'Playlist F',
                        can_edit: true
                    },
                    children: ['playlist_e'],
                    parents: []
                },
            }
    
            let playlistGraph = new PlaylistGraph(graphDocument);
            let operations = playlistGraph.getOrderOfOperations();
    
            let expected: PlaylistOperation[] = [
                {"source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T02:00:00.000Z"))},
                {"source_id":"playlist_b","dest_id":"playlist_e","after_date":new Date(Date.parse("1970-01-01T04:30:00.000Z"))},
                {"source_id":"playlist_a","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
                {"source_id":"playlist_c","dest_id":"playlist_e","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
                {"source_id":"playlist_e","dest_id":"playlist_f","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
            ];
    
            expect(operations === expected);
        });
    
        it("Advanced Dependency Graph 2", () => {
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
                        },
                        {
                            id: 'playlist_c',
                            after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                        },
                        {
                            id: 'playlist_d',
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
                            id: 'playlist_c',
                            after_date: new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))
                        },{
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 4:30:00 GMT'))
                        }
                    ]
                },
    
                playlist_c: {
                    playlist_ref: {
                        id: 'playlist_c',
                        name: 'Playlist C',
                        can_edit: true
                    },
                    children: ['playlist_a', 'playlist_b'],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 3:10:00 GMT'))
                        }
                    ]
                },
    
                playlist_d: {
                    playlist_ref: {
                        id: 'playlist_d',
                        name: 'Playlist D',
                        can_edit: true
                    },
                    children: ['playlist_a', 'playlist_b', 'playlist_c'],
                    parents: []
                }
            }
    
            let playlistGraph = new PlaylistGraph(graphDocument);
            let operations = playlistGraph.getOrderOfOperations();
    
            let expected: PlaylistOperation[] = [
                {"source_id":"playlist_a","dest_id":"playlist_b","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
                {"source_id":"playlist_a","dest_id":"playlist_c","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
                {"source_id":"playlist_a","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
                {"source_id":"playlist_b","dest_id":"playlist_c","after_date":new Date(Date.parse("1970-01-01T02:00:00.000Z"))},
                {"source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T04:30:00.000Z"))},
                {"source_id":"playlist_c","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
            ];
    
            expect(operations === expected);
        });
    });


    describe("Handling cycles", () => {
        it("Basic Cyclic Dependency Graph", () => {
            let graphDocument: GraphDocument = {
                playlist_a: {
                    playlist_ref: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        can_edit: true
                    },
                    children: ['playlist_b'],
                    parents: [
                        {
                            id: 'playlist_b',
                            after_date: new Date(Date.parse('01 Jan 1970 00:00:00 GMT'))
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
                            id: 'playlist_a',
                            after_date: new Date(Date.parse('01 Jan 1970 00:00:00 GMT'))
                        }
                    ]
                }
            };
    
    
            try {
                new PlaylistGraph(graphDocument);
            }
            catch (e) {
                expect(e === "Cannot build graph - document contains cycles!")
            }
        });

        it("Self-Cycle Dependency Graph", () => {
            let graphDocument: GraphDocument = {
                playlist_a: {
                    playlist_ref: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        can_edit: true
                    },
                    children: ['playlist_a'],
                    parents: [
                        {
                            id: 'playlist_a',
                            after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                        }
                    ]
                }
            }
    
            try {
                new PlaylistGraph(graphDocument);
            }
            catch (e) {
                expect(e === "Cannot build graph - document contains cycles!")
            }
        });
    });


    describe("Edge cases", () => {
        it("Empty Dependency Graph", () => {
            let graphDocument: GraphDocument = { };
    
            let playlistGraph = new PlaylistGraph(graphDocument);
            let operations = playlistGraph.getOrderOfOperations();
    
            let expected: PlaylistOperation[] = [];
    
            expect(operations === expected);
        });

        it("Single Node Dependency Graph", () => {
            let graphDocument: GraphDocument = {
                playlist_a: {
                    playlist_ref: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        can_edit: true
                    },
                    children: [],
                    parents: []
                }
            }
    
            let playlistGraph = new PlaylistGraph(graphDocument);
            let operations = playlistGraph.getOrderOfOperations();
    
            let expected: PlaylistOperation[] = [];
    
            expect(operations === expected);
        });
    });
    
});