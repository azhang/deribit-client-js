import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('spec publication uses distinct branches for same-day runs and retries', () => {
  const assignment = workflow.match(/^\s*(branch=.*)$/m)?.[1];
  assert.ok(assignment, 'spec publication must select a branch');
  const branches = [['100', '1'], ['100', '2'], ['101', '1']].map(([run, attempt]) => {
    const branch = execFileSync('bash', ['-uc', `${assignment}\nprintf '%s' "$branch"`], {
      env: { ...process.env, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt },
      encoding: 'utf8',
    });
    execFileSync('git', ['check-ref-format', '--branch', branch]);
    return branch;
  });
  assert.equal(new Set(branches).size, branches.length,
    'a successful push followed by failed PR creation must not block the next attempt');
});
