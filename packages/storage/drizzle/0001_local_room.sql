CREATE SCHEMA local_room;
--> statement-breakpoint
CREATE TABLE local_room.room (
	project_id uuid NOT NULL,
	room_id uuid NOT NULL,
	next_seq bigint NOT NULL DEFAULT 1 CHECK (next_seq >= 1),
	PRIMARY KEY (project_id, room_id)
);
--> statement-breakpoint
CREATE TABLE local_room.message (
	project_id uuid NOT NULL,
	room_id uuid NOT NULL,
	room_seq bigint NOT NULL CHECK (room_seq >= 1),
	message_id uuid NOT NULL,
	author_kind text NOT NULL CHECK (author_kind IN ('human', 'local_agent')),
	author_principal_id uuid NOT NULL,
	command_id uuid NOT NULL,
	body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4096 AND octet_length(body) <= 16384),
	citations jsonb NOT NULL CHECK (jsonb_typeof(citations) = 'array' AND jsonb_array_length(citations) <= 10),
	created_at timestamptz NOT NULL,
	PRIMARY KEY (project_id, room_id, room_seq),
	UNIQUE (project_id, message_id),
	FOREIGN KEY (project_id, room_id) REFERENCES local_room.room (project_id, room_id)
);
--> statement-breakpoint
CREATE TABLE local_room.event (
	project_id uuid NOT NULL,
	stream_id uuid NOT NULL,
	seq bigint NOT NULL CHECK (seq >= 1),
	event_id uuid NOT NULL,
	kind text NOT NULL CHECK (kind = 'local_room.message_created'),
	actor uuid NOT NULL,
	occurred_at timestamptz NOT NULL,
	payload jsonb NOT NULL,
	PRIMARY KEY (project_id, stream_id, seq),
	UNIQUE (project_id, event_id),
	FOREIGN KEY (project_id, stream_id, seq) REFERENCES local_room.message (project_id, room_id, room_seq)
);
--> statement-breakpoint
CREATE TABLE local_room.command_receipt (
	project_id uuid NOT NULL,
	actor uuid NOT NULL,
	command_id uuid NOT NULL,
	request_digest text NOT NULL CHECK (request_digest ~ '^sha256:[0-9a-f]{64}$'),
	receipt jsonb NOT NULL,
	PRIMARY KEY (project_id, actor, command_id)
);
--> statement-breakpoint
CREATE FUNCTION local_room.refuse_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'local_room.% is immutable', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END
$$;
--> statement-breakpoint
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON local_room.message FOR EACH ROW EXECUTE FUNCTION local_room.refuse_change();
--> statement-breakpoint
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON local_room.event FOR EACH ROW EXECUTE FUNCTION local_room.refuse_change();
--> statement-breakpoint
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON local_room.command_receipt FOR EACH ROW EXECUTE FUNCTION local_room.refuse_change();
--> statement-breakpoint
INSERT INTO local_room.room (project_id, room_id) VALUES ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');
--> statement-breakpoint
ALTER TABLE local_room.room ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.room FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.message ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.message FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.event ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.event FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.command_receipt ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE local_room.command_receipt FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY project_isolation ON local_room.room FOR ALL
	USING (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY project_isolation ON local_room.message FOR ALL
	USING (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY project_isolation ON local_room.event FOR ALL
	USING (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY project_isolation ON local_room.command_receipt FOR ALL
	USING (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (project_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
GRANT USAGE ON SCHEMA local_room TO agora_app;
--> statement-breakpoint
GRANT SELECT, UPDATE (next_seq) ON local_room.room TO agora_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON local_room.message, local_room.event, local_room.command_receipt TO agora_app;
