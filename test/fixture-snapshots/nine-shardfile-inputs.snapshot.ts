// CI7: the fixtures CI job runs this file with WS_FIXTURE_SNAPSHOT_WRITE so Nine's shard file source read runs once per CI run (test/fixtures/runSnapshot.ts).
import { expect, test } from 'vitest';
import { inputs } from '../fixtures/nine-shardfile-inputs';

test('nine-shardfile-inputs snapshot', () => { expect(inputs).toBeDefined(); });
