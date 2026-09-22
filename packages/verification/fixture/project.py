"""Independent SQLite HTTP fixture and JSON Schema consumer; no production authority."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
try:
    from jsonschema import Draft202012Validator, FormatChecker, ValidationError
except ImportError:
    Draft202012Validator = None

bundle = json.loads(Path('contracts/generated/openapi.bundled.json').read_text())
def validate(name, value):
    schema = {'$ref': '#/components/schemas/' + name, 'components': bundle['components']}
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)

def serve(state):
    db = sqlite3.connect(state['database'])
    db.execute('CREATE TABLE effects (id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass
        def reply(self, status, value):
            data = json.dumps(value).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        def authorized(self):
            if self.headers.get('x-agora-handle') != state['handle']:
                self.reply(403, {'reason_code': 'scope_mismatch'})
                return False
            return True
        def do_GET(self):
            if not self.authorized():
                return
            if self.path == '/api/v1/health/ready':
                db.execute('SELECT 1')
                self.reply(200, {'schema_version': 'agora.readiness/v1', 'status': 'ready', 'checks': {'database': 'ok'}})
            elif self.path == '/api/v1/fixture/effects':
                rows = db.execute('SELECT id,value FROM effects ORDER BY id').fetchall()
                self.reply(200, [{'report': json.loads(v), 'object': json.loads((Path(state['object_namespace']) / f'{i}.json').read_text())} for i, v in rows])
            else:
                self.reply(404, {'reason_code': 'not_found'})
        def do_POST(self):
            if not self.authorized():
                return
            if self.path != '/api/v1/fixture/policy/decisions':
                self.reply(404, {'reason_code': 'not_found'})
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 131072:
                    raise ValueError('body bound')
                command = json.loads(self.rfile.read(size))
                validate('FixturePolicyCommand', command)
            except (ValueError, ValidationError):
                self.reply(400, {'reason_code': 'malformed_command'})
                return
            same = command['actor']['scope_id'] == command['subject']['scope_id']
            report = {'schema_version': 'agora.fixture-policy-decision/v1', 'decision': 'allow' if same else 'deny', 'policy_version': 'agora.fixture-policy/v1', 'policy_digest': 'sha256:6bb3839045a8266e1ae93d4e7a2483a73225943fd9360b6c3c11e4e69b8b4fa4'}
            if not same:
                report['reason_code'] = 'scope_mismatch'
            validate('FixturePolicyDecisionReport', report)
            with db:
                row = db.execute('INSERT INTO effects(value) VALUES (?)', (json.dumps(report),))
                (Path(state['object_namespace']) / f'{row.lastrowid}.json').write_text(json.dumps(report))
            self.reply(200, report)
    server = HTTPServer(('127.0.0.1', 0), Handler)
    print(json.dumps({'url': f'http://127.0.0.1:{server.server_port}'}), flush=True)
    server.serve_forever()

if sys.argv[1] == 'serve':
    serve(json.loads(sys.argv[2]))
else:
    env = {k: v for k, v in os.environ.items() if k in ('PATH', 'HOME', 'TMPDIR', 'LANG', 'AGORA_PG_BIN')}
    result = subprocess.run(['node', 'scripts/project.mjs', 'project', *sys.argv[1:], '--fixture', 'python'], capture_output=True, text=True, env=env, timeout=300)
    report = json.loads(result.stdout)
    if Draft202012Validator is None:
        report['outcome'] = 'blocked'
        report['diagnostics'] = [{'reason_code': 'blocked_prerequisite', 'message': 'Install the locked Python requirements'}]
        print(json.dumps(report))
        sys.exit(2)
    validate('CliReport', report)
    if result.returncode != {'pass': 0, 'fail': 1, 'blocked': 2, 'unavailable': 3, 'usage_error': 64, 'infrastructure_failure': 70}[report['outcome']]:
        raise ValueError('exit/outcome mismatch')
    print(json.dumps(report))
    sys.exit(result.returncode)
