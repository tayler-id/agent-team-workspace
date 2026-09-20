CREATE SCHEMA foundation_fixture;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agora_app') THEN
		CREATE ROLE agora_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
	END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE foundation_fixture.stream (
	stream_id uuid PRIMARY KEY,
	scope_id uuid NOT NULL,
	next_seq bigint NOT NULL DEFAULT 1 CHECK (next_seq >= 1)
);
--> statement-breakpoint
CREATE TABLE foundation_fixture.event (
	stream_id uuid NOT NULL REFERENCES foundation_fixture.stream (stream_id),
	seq bigint NOT NULL CHECK (seq >= 1),
	scope_id uuid NOT NULL,
	kind text NOT NULL CHECK (length(kind) BETWEEN 1 AND 64),
	payload jsonb NOT NULL,
	PRIMARY KEY (stream_id, seq)
);
--> statement-breakpoint
CREATE TABLE foundation_fixture.claim (
	subject_id uuid PRIMARY KEY,
	scope_id uuid NOT NULL,
	claimed_by text NOT NULL CHECK (length(claimed_by) BETWEEN 1 AND 128),
	fence bigint NOT NULL CHECK (fence >= 0)
);
--> statement-breakpoint
ALTER TABLE foundation_fixture.stream ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE foundation_fixture.event ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE foundation_fixture.claim ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY scope_isolation ON foundation_fixture.stream FOR ALL TO agora_app
	USING (scope_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (scope_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY scope_isolation ON foundation_fixture.event FOR ALL TO agora_app
	USING (scope_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (scope_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY scope_isolation ON foundation_fixture.claim FOR ALL TO agora_app
	USING (scope_id = nullif(current_setting('agora.scope_id', true), '')::uuid)
	WITH CHECK (scope_id = nullif(current_setting('agora.scope_id', true), '')::uuid);
--> statement-breakpoint
GRANT USAGE ON SCHEMA foundation_fixture TO agora_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON foundation_fixture.stream, foundation_fixture.event, foundation_fixture.claim TO agora_app;
