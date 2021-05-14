import { expect } from 'chai';
import { GraphDocument } from '../../app/firebase/adt/playlist_management/graph_document';
import { PlaylistOperation } from '../../app/playlist_managment/adt/operations/playlist_operation';
import { PlaylistOperationType } from '../../app/playlist_managment/adt/operations/playlist_operation_type';
import { PlaylistGraph } from '../../app/playlist_managment/adt/playlist_graph/playlist_graph';

describe("Playlist Dependency Graph", () => {

    it("Basic Dependency Graph", () => {
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


        let playlistGraph = new PlaylistGraph(graphDocument);
        let operations = playlistGraph.getOrderOfOperations();

        let expected: PlaylistOperation[] = [
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_c","dest_id":"playlist_d","after_date":new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_c","dest_id":"playlist_d","after_date":new Date(Date.parse('01 Jan 1970 3:00:00 GMT'))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_a","dest_id":"playlist_b","after_date":new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_a","dest_id":"playlist_b","after_date":new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse('01 Jan 1970 2:00:00 GMT'))}
        ];

        expect(operations === expected);
    });

    it("Basic Cyclic Dependency Graph", () => {
        let graphDocument: GraphDocument = {
            playlists: {
                playlist_a: {
                    data: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: ['playlist_b'],
                    parents: [
                        {
                            id: 'playlist_b',
                            after_date: new Date(Date.parse('01 Jan 1970 00:00:00 GMT'))
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
                            id: 'playlist_a',
                            after_date: new Date(Date.parse('01 Jan 1970 00:00:00 GMT'))
                        }
                    ]
                }
            }
        };


        try {
            new PlaylistGraph(graphDocument);
        }
        catch (e) {
            expect(e === "Cannot build graph - document contains cycles!")
        }
    });

    it("Advanced Dependency Graph", () => {
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
                            id: 'playlist_d',
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
                    children_ids: [],
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
                    data: {
                        id: 'playlist_c',
                        name: 'Playlist C',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: [],
                    parents: [
                        {
                            id: 'playlist_e',
                            after_date: new Date(Date.parse('01 Jan 1970 3:10:00 GMT'))
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
                    children_ids: ['playlist_a', 'playlist_b'],
                    parents: []
                },

                playlist_e: {
                    data: {
                        id: 'playlist_e',
                        name: 'Playlist E',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: ['playlist_b', 'playlist_c'],
                    parents: [
                        {
                            id: 'playlist_f',
                            after_date: new Date(Date.parse('01 Jan 1970 3:10:00 GMT'))
                        }
                    ]
                },

                playlist_f: {
                    data: {
                        id: 'playlist_f',
                        name: 'Playlist F',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: ['playlist_e'],
                    parents: []
                },
            }
        }

        let playlistGraph = new PlaylistGraph(graphDocument);
        let operations = playlistGraph.getOrderOfOperations();

        let expected: PlaylistOperation[] = [
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T02:00:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T02:00:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_b","dest_id":"playlist_e","after_date":new Date(Date.parse("1970-01-01T04:30:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_b","dest_id":"playlist_e","after_date":new Date(Date.parse("1970-01-01T04:30:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_a","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_a","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_c","dest_id":"playlist_e","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_c","dest_id":"playlist_e","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_e","dest_id":"playlist_f","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_e","dest_id":"playlist_f","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))}
        ];

        expect(operations === expected);
    });


    it("Advanced Dependency Graph 2", () => {
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
                    data: {
                        id: 'playlist_b',
                        name: 'Playlist B',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: ['playlist_a'],
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
                    data: {
                        id: 'playlist_c',
                        name: 'Playlist C',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: ['playlist_a', 'playlist_b'],
                    parents: [
                        {
                            id: 'playlist_d',
                            after_date: new Date(Date.parse('01 Jan 1970 3:10:00 GMT'))
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
                    children_ids: ['playlist_a', 'playlist_b', 'playlist_c'],
                    parents: []
                }
            }
        }

        let playlistGraph = new PlaylistGraph(graphDocument);
        let operations = playlistGraph.getOrderOfOperations();

        let expected: PlaylistOperation[] = [
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_a","dest_id":"playlist_b","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_a","dest_id":"playlist_b","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_a","dest_id":"playlist_c","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_a","dest_id":"playlist_c","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_a","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_a","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T01:00:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_b","dest_id":"playlist_c","after_date":new Date(Date.parse("1970-01-01T02:00:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_b","dest_id":"playlist_c","after_date":new Date(Date.parse("1970-01-01T02:00:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T04:30:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_b","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T04:30:00.000Z"))},
            {"type":PlaylistOperationType.REMOVE,"source_id":"playlist_c","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))},
            {"type":PlaylistOperationType.ADD,   "source_id":"playlist_c","dest_id":"playlist_d","after_date":new Date(Date.parse("1970-01-01T03:10:00.000Z"))}
        ];

        expect(operations === expected);
    });


    it("Empty Dependency Graph", () => {
        let graphDocument: GraphDocument = {
            playlists: { }
        }

        let playlistGraph = new PlaylistGraph(graphDocument);
        let operations = playlistGraph.getOrderOfOperations();

        let expected: PlaylistOperation[] = [];

        expect(operations === expected);
    });


    it("Self-Cycle Dependency Graph", () => {
        let graphDocument: GraphDocument = {
            playlists: {
                playlist_a: {
                    data: {
                        id: 'playlist_a',
                        name: 'Playlist A',
                        tracks: [],
                        can_edit: true
                    },
                    children_ids: ['playlist_a'],
                    parents: [
                        {
                            id: 'playlist_a',
                            after_date: new Date(Date.parse('01 Jan 1970 1:00:00 GMT'))
                        }
                    ]
                }
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