const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { layout, verifyPair } = require('./catalog.cjs');

const pins = Object.freeze({
	backend: {
		name: 'coin-arbitrer',
		revision: 'b8d1a6e685b7be0a5ec5ec93d2f652707e724e17',
		acceptedOverlay: '1eaffdda001596f585acb8c91cc87758fe309ba85f2b9b75ab9068ebbbdc2f83',
		core: 'cf71462275f8d26541cee86ecba1134eb289e0d5d9f751d1236a4bda0298ab06',
		package: '924c9230034c95a6e21ca03cca61818a3c9cf6da19831e5adb8766e4544c039a',
	},
	frontend: {
		name: 'coin-arbitrage-frontend',
		revision: '2c731ce387e3b4e0bbe5b0f2278c2e0eea7ada9b',
		acceptedOverlay: '2f6dbd4b383ffeccc8bba21581dd07e9dd2daf93f028948aae8b29bda82c2199',
		core: '5b166c3865accfda332860a4d9408448d80d5a16bc852892d545657997be25c6',
		package: 'd9f7fbe345824054908b41d7f4ea50cd23c0139b10c4d9dd7b551bd4e6df4a8c',
	},
});
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const backendCoreAmendments = Object.freeze(
	[
		{
			file: 'test/backend/harness/mongo-scope.test.cjs',
			previousSha256: 'fd00d1a5ba49a15c78886c9da791d988a1e8ba36dc1c5e108adef55a09ef1c58',
			sha256: '6dc0ca5909c8c1d2aaa313bc1a878f0d41cf9fbc20d6acc7241b742b429965d0',
			reason: 'Canonical fixture root and portable symlink-path regression',
		},
		{
			file: 'test/backend/support/ws-wire.cjs',
			previousSha256: '5814db5e9a7f72a5629e3caa1708c98c35b072da76dcc5dd6f36cdcbdbaf8c9b',
			sha256: '377cb337fe5f0832e92a02e9ec99d7deb4ce0d404345c549b0a6854fedd93108',
			reason: 'Await provider close handlers before restoring wire-fixture mocks',
		},
		{
			file: 'test/backend/harness/fixtures/ws-wire-passing.case.js',
			previousSha256: '2fb78a614f426ba9cf70ca0f19796fe12c0d647735cf82fbaf72635f6f1f6e0f',
			sha256: 'cd29b2530b94a1fbb99b3809cf6136d7dc78f35300c92fea7651bc1707f656ea',
			reason: 'Native wire regression requires provider-close observation before cleanup',
		},
	].map(amendment => Object.freeze(amendment))
);
const verifyFrozenCore = (role, core) => {
	const amendments = role === 'backend' ? backendCoreAmendments : [];
	const baseline = { ...core };
	amendments.forEach(amendment => {
		if (baseline[amendment.file] !== amendment.sha256)
			throw new Error('Reviewed B/F fixture amendment differs from pinned content');
		baseline[amendment.file] = amendment.previousSha256;
	});
	if (digest(JSON.stringify(baseline)) !== pins[role]?.core)
		throw new Error('Accepted B/F core overlay has changed');
	return amendments;
};
const isFrozenCoreFile = (role, file) => {
	const prefix =
		role === 'backend' ? 'test/integration-contracts/' : 'src/test/integration-contracts/';
	return (
		file !== 'package.json' &&
		file !== 'docs/testing/coordination.md' &&
		![
			'docs/testing/integration-plan.md',
			'docs/testing/integration-contracts.md',
			'docs/testing/integration-report.md',
		].includes(file) &&
		(!file.startsWith(prefix) ||
			['bootstrap.test.cjs', 'catalog.cjs', 'context.cjs', 'verify.cjs'].includes(
				file.slice(prefix.length)
			))
	);
};
const git = (root, ...args) =>
	cp
		.execFileSync('/usr/bin/git', ['-C', root, ...args], {
			encoding: 'utf8',
			timeout: 15000,
			maxBuffer: 4 * 1024 * 1024,
		})
		.trimEnd();
const inspectRepository = (directory, role, expectedRevision) => {
	const root = fs.realpathSync(directory);
	const pin = pins[role];
	if (!pin || !/^[a-f0-9]{40}$/.test(expectedRevision || ''))
		throw new Error('An explicit full expected revision is required');
	const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
	if (pkg.name !== pin.name) throw new Error('Pinned repository role mismatch');
	const head = git(root, 'rev-parse', 'HEAD');
	if (head !== expectedRevision)
		throw new Error('Actual revision differs from the expected pair');
	git(root, 'merge-base', '--is-ancestor', pin.revision, head);
	if (git(root, 'diff', '--cached', '--name-only'))
		throw new Error('Integration index must remain empty');
	const changed = [
		...new Set(
			[
				...git(root, 'diff', pin.revision, '--name-only').split('\n'),
				...git(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0'),
			].filter(Boolean)
		),
	].sort();
	const coreFiles = changed.filter(file => isFrozenCoreFile(role, file));
	const core = Object.fromEntries(
		coreFiles.map(file => [file, digest(fs.readFileSync(path.join(root, file)))])
	);
	const frozenCoreAmendments = verifyFrozenCore(role, core);
	const sources = git(root, 'ls-tree', '-r', pin.revision)
		.split('\n')
		.map(line => line.split('\t'))
		.filter(
			([, file]) =>
				file?.endsWith('.js') &&
				!file.startsWith('test/') &&
				!file.startsWith('src/test/') &&
				!file.startsWith('docs/') &&
				!file.startsWith('.github/') &&
				file !== 'src/setupTests.js' &&
				!file.endsWith('.test.js') &&
				!file.endsWith('.spec.js')
		);
	const expectedSource = Object.fromEntries(
		sources.map(([entry, file]) => {
			const [mode, type, object] = entry.split(' ');
			if (type !== 'blob') throw new Error('Unexpected production source tree entry');
			return [file, `${mode}:${object}`];
		})
	);
	const actualSource = Object.fromEntries(
		sources.map(([, file]) => {
			const filename = path.join(root, file);
			const stat = fs.lstatSync(filename);
			const content = stat.isSymbolicLink()
				? Buffer.from(fs.readlinkSync(filename))
				: fs.readFileSync(filename);
			const hasExecutePermission = /[1357]/.test(stat.mode.toString(8).slice(-3));
			let mode = hasExecutePermission ? '100755' : '100644';
			if (stat.isSymbolicLink()) mode = '120000';
			const blob = crypto
				.createHash('sha1')
				.update(`blob ${content.length}\0`)
				.update(content)
				.digest('hex');
			return [file, `${mode}:${blob}`];
		})
	);
	const productionSource = {
		scope: 'tracked non-test JavaScript, including modes and symlink targets',
		files: sources.length,
		expectedSha256: digest(JSON.stringify(expectedSource)),
		actualSha256: digest(JSON.stringify(actualSource)),
	};
	if (productionSource.actualSha256 !== productionSource.expectedSha256)
		throw new Error('Production source tree differs from the accepted base');
	const normalized = JSON.parse(JSON.stringify(pkg));
	delete normalized.scripts['test:int'];
	delete normalized.scripts['test:int:coverage'];
	if (digest(JSON.stringify(normalized)) !== pin.package)
		throw new Error('Only coordinated INT npm aliases may change the accepted package');
	const files = Object.fromEntries(
		changed.map(file => [file, digest(fs.readFileSync(path.join(root, file)))])
	);
	const worktrees = git(root, 'worktree', 'list', '--porcelain')
		.split('\n')
		.filter(line => line.startsWith('worktree '))
		.map(line => fs.realpathSync(line.slice(9)));
	const originalLock = path.join(worktrees[0], 'package-lock.json');
	return {
		root,
		role,
		head,
		acceptedBase: pin.revision,
		acceptedOverlay: pin.acceptedOverlay,
		branch: git(root, 'branch', '--show-current'),
		status: git(root, 'status', '--porcelain=v1', '--untracked-files=all'),
		productionTreeUnchanged: true,
		productionSource,
		frozenCoreVerified: true,
		frozenCoreUnchanged: frozenCoreAmendments.length === 0,
		frozenCoreAmendments,
		frozenCoreSha256: digest(JSON.stringify(core)),
		workingOverlay: digest(JSON.stringify(files)),
		files,
		lockfile: git(root, 'hash-object', 'package-lock.json'),
		lockfileHead: git(root, 'rev-parse', 'HEAD:package-lock.json'),
		lockfileSha256: digest(fs.readFileSync(path.join(root, 'package-lock.json'))),
		primaryCheckoutLockfile: {
			path: originalLock,
			sha256: fs.existsSync(originalLock) ? digest(fs.readFileSync(originalLock)) : null,
		},
		baseTree: git(root, 'rev-parse', `${pin.revision}^{tree}`),
		headTree: git(root, 'rev-parse', 'HEAD^{tree}'),
		worktrees,
		cleanCommitValidation: false,
	};
};
const checkPair = options => {
	const backend = inspectRepository(options.backendDir, 'backend', options.backendRevision);
	const frontend = inspectRepository(options.frontendDir, 'frontend', options.frontendRevision);
	if (backend.root === frontend.root) throw new Error('The pair must use different repositories');
	const fixtures = verifyPair(layout(backend.root), layout(frontend.root));
	return { backend, frontend, fixtureDigest: fixtures.digest, fixtureVersion: fixtures.version };
};

module.exports = { pins, digest, inspectRepository, checkPair, isFrozenCoreFile, verifyFrozenCore };
