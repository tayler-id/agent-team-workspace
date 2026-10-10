import { LOCAL_ROOM, type LocalRoomPort } from '@agora/domain';
import { createPostgresLocalRoom, type Database } from '@agora/storage';

/** The center's only local-room adapter selection: the fixed local-development room over PostgreSQL, as the non-owner service role. */
export const selectLocalRoom = (database: Database): LocalRoomPort => createPostgresLocalRoom(database, LOCAL_ROOM);
