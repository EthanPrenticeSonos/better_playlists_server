import { PlaylistOperationType } from "./playlist_operation_type";

export interface PlaylistOperation {
    type: PlaylistOperationType;

    source_id: string;
    dest_id: string;

    after_date: Date;
}