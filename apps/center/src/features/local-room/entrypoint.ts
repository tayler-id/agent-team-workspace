import { LOCAL_ROOM, type LocalRoomPort } from '@agora/domain';
import { createPostgresLocalRoom, type Database } from '@agora/storage';

/** The local-room adapter selection that `main.ts` composes: the fixed local-development room over PostgreSQL, as the non-owner service role. */
export const selectLocalRoom = (database: Database): LocalRoomPort => createPostgresLocalRoom(database, LOCAL_ROOM);
