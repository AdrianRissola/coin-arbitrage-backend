const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { isFrozenCoreFile, inspectRepository, verifyFrozenCore } = require('./pair.cjs');
const { istanbulSummary, v8Summary } = require('./evidence.cjs');
const { reportPath } = require('./run.cjs');

test('I3 permits exactly the three integration deliverable documents, not other core paths', () => {
	const paths = [
		'docs/testing/integration-plan.md',
		'docs/testing/integration-contracts.md',
		'docs/testing/integration-report.md',
		'docs/testing/backend-runner.md',
		'docs/testing/frontend-runner.md',
		'.github/workflows/regression-tests.yml',
		'package-lock.json',
		'service/ArbitrageService.js',
		'src/App.js',
		'test/integration-contracts/catalog.cjs',
		'src/test/integration-contracts/catalog.cjs',
	];
	assert.deepEqual(
		['backend', 'frontend'].map(role => paths.map(file => isFrozenCoreFile(role, file))),
		['backend', 'frontend'].map(() => [
			false,
			false,
			false,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
		])
	);
});
test('reviewed fixture amendments stay in the frozen core and reject every unreviewed change', () => {
	const root = path.resolve(__dirname, '../..');
	const metadata = inspectRepository(
		root,
		'backend',
		cp
			.execFileSync('/usr/bin/git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
			.trim()
	);
	const core = Object.fromEntries(
		Object.entries(metadata.files).filter(([file]) => isFrozenCoreFile('backend', file))
	);
	assert.deepEqual(
		metadata.frozenCoreAmendments.map(amendment => amendment.file),
		[
			'test/backend/harness/mongo-scope.test.cjs',
			'test/backend/support/ws-wire.cjs',
			'test/backend/harness/fixtures/ws-wire-passing.case.js',
		]
	);
	assert.equal(metadata.frozenCoreUnchanged, false);
	metadata.frozenCoreAmendments.forEach(amendment => {
		assert.equal(isFrozenCoreFile('backend', amendment.file), true);
		assert.throws(
			() =>
				verifyFrozenCore('backend', {
					...core,
					[amendment.file]: amendment.previousSha256,
				}),
			/amendment/
		);
		assert.throws(
			() => verifyFrozenCore('backend', { ...core, [amendment.file]: '0'.repeat(64) }),
			/amendment/
		);
	});
	assert.throws(
		() => verifyFrozenCore('backend', { ...core, 'test/backend/run.cjs': '0'.repeat(64) }),
		/core overlay/
	);
	assert.throws(
		() =>
			verifyFrozenCore('backend', { ...core, 'test/backend/unreviewed.cjs': '0'.repeat(64) }),
		/core overlay/
	);
});
test('I3 retains unlike native and Istanbul coverage denominators without merging profiles', () => {
	const frontend = istanbulSummary({
		source: { s: { 0: 2, 1: 0 }, f: { 0: 1 }, b: { 0: [2, 0], 1: [0, 1] } },
	});
	const backend = v8Summary(
		[
			{
				url: 'file:///owned/model.js',
				functions: [
					{ ranges: [{ startOffset: 0, endOffset: 100, count: 1 }] },
					{ ranges: [{ startOffset: 10, endOffset: 50, count: 0 }] },
				],
			},
			{ url: 'file:///owned/node_modules/dep.js', functions: [] },
			{ url: 'file:///owned/test/helper.js', functions: [] },
		],
		'/owned'
	);
	assert.deepEqual(
		{ frontend, backend: [backend.loadedScripts, backend.functions, backend.coveredFunctions] },
		{
			frontend: {
				statements: { total: 2, covered: 1, percent: 50 },
				functions: { total: 1, covered: 1, percent: 100 },
				branches: { total: 4, covered: 2, percent: 50 },
			},
			backend: [1, 2, 1],
		}
	);
});
test('I3 refuses absent coverage data instead of reporting an empty success', () => {
	assert.throws(() => istanbulSummary({}), /Empty actual frontend/);
	assert.throws(() => v8Summary([], '/owned'), /No loaded backend/);
});
test('I3 rejects output inside any preserved worktree including a symlinked parent', () => {
	const temporary = fs.realpathSync(
		fs.mkdtempSync(path.join(os.tmpdir(), 'int-output-control-'))
	);
	const repository = path.join(temporary, 'prior-worktree');
	fs.mkdirSync(repository);
	fs.symlinkSync(repository, path.join(temporary, 'link'));
	assert.throws(
		() => reportPath(path.join(repository, 'reports'), [repository]),
		/every registered/
	);
	assert.throws(
		() => reportPath(path.join(temporary, 'link/reports'), [repository]),
		/every registered/
	);
	assert.equal(
		reportPath(path.join(temporary, 'safe-report'), [repository]),
		path.join(fs.realpathSync(temporary), 'safe-report')
	);
});
