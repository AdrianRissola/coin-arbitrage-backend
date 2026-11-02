const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { checkPair } = require('./pair.cjs');
const { flows, selectFlows, validateControl } = require('./bridge-protocol.cjs');
const { startProvider } = require('./controller.cjs');
const { installedVersions, collectCoverage } = require('./evidence.cjs');

const load = createRequire(__filename);

const reportPath = (directory, worktrees) => {
	const resolved = path.join(
		fs.realpathSync(path.dirname(path.resolve(directory))),
		path.basename(directory)
	);
	if (worktrees.some(root => resolved === root || resolved.startsWith(root + path.sep)))
		throw new Error('INT reports must be outside every registered repository worktree');
	return resolved;
};
const parse = argv => {
	const args = argv.slice();
	const options = { backendDir: path.resolve(__dirname, '../..'), flows: 'all' };
	const keys = {
		'--frontend-dir': 'frontendDir',
		'--backend-rev': 'backendRevision',
		'--frontend-rev': 'frontendRevision',
		'--report-dir': 'directory',
		'--flows': 'flows',
		'--image': 'image',
	};
	while (args.length) {
		const flag = args.shift();
		if (flag === '--coverage') options.coverage = true;
		else if (flag === '--detect-open-handles') options.handles = true;
		else {
			const value = args.shift();
			if (!keys[flag] || !value || value.startsWith('--'))
				throw new Error('Invalid INT runner arguments');
			options[keys[flag]] = value;
		}
	}
	if (!options.frontendDir) throw new Error('An explicit pinned frontend directory is required');
	if (options.image && options.image !== 'mongo:4.4.1')
		throw new Error('INT accepts only the cached MongoDB 4.4.1 image');
	selectFlows(options.flows);
	return options;
};
const acceptedFrontend = report =>
	report?.success === true &&
	report.openHandleCount === 0 &&
	report.openHandlesMeasured === true &&
	Array.isArray(report.requiredFlows) &&
	report.requiredFlows.length > 0 &&
	Array.isArray(report.completedFlows) &&
	new Set(report.completedFlows).size === report.completedFlows.length &&
	report.completedFlows.every(flow => flows.includes(flow)) &&
	report.requiredFlows.every(
		flow => flows.includes(flow) && report.completedFlows.includes(flow)
	) &&
	report.scope === 'integration' &&
	report.transportMode === 'real-loopback' &&
	report.stages?.length === 1 &&
	report.stages.every(
		stage =>
			stage.success === true &&
			stage.childCode === 0 &&
			!stage.signal &&
			stage.timedOut === false &&
			Number.isInteger(stage.totalTests) &&
			stage.totalTests > 0 &&
			stage.passedTests === stage.totalTests &&
			stage.skippedTests === 0 &&
			stage.failedTests === 0
	);
const run = async options => {
	const startedAt = new Date().toISOString();
	const pair = checkPair(options);
	const installed = installedVersions(pair);
	const selected = selectFlows(options.flows || 'all');
	const candidate = reportPath(
		options.directory || path.join(os.tmpdir(), 'coin-arbitrage-int-'),
		[...pair.backend.worktrees, ...pair.frontend.worktrees]
	);
	const directory = options.directory ? candidate : fs.mkdtempSync(candidate);
	if (options.directory) fs.mkdirSync(directory, { mode: 0o700 });
	const stages = [];
	const errors = [];
	const jobs = new Set();
	const seen = new Set();
	let provider;
	let watcher;
	let interrupted = false;
	const interrupt = () => {
		interrupted = true;
	};
	process.once('SIGINT', interrupt);
	process.once('SIGTERM', interrupt);
	try {
		provider = await startProvider(pair, directory);
		const targets = new Set(['frontend-transport', 'frontend-app']);
		watcher = fs.watch(directory, { recursive: true }, (event, filename) => {
			if (!filename) return;
			const relative = String(filename).split(path.sep).join('/');
			const match = relative.match(/^([^/]+)\/int-rpc-([a-f0-9]{32})\.request\.json$/);
			if (!match || !targets.has(match[1]) || seen.has(relative)) return;
			seen.add(relative);
			const job = (async () => {
				const destination = path.join(
					directory,
					match[1],
					`int-rpc-${match[2]}.response.json`
				);
				let reply;
				try {
					const message = JSON.parse(fs.readFileSync(path.join(directory, relative)));
					validateControl(message, provider.token);
					if (message.id !== match[2])
						throw new Error('INT control filename/message mismatch');
					const value = await provider.control(message.action, message.args);
					reply = {
						version: 1,
						id: message.id,
						ok: true,
						value:
							message.action === 'status'
								? { ...value, selectedFlows: selected }
								: value,
					};
				} catch (error) {
					reply = { version: 1, id: match[2], ok: false, error: error.message };
				}
				fs.writeFileSync(`${destination}.tmp`, JSON.stringify(reply), { mode: 0o600 });
				fs.renameSync(`${destination}.tmp`, destination);
			})();
			jobs.add(job);
			job.then(
				() => jobs.delete(job),
				error => {
					jobs.delete(job);
					errors.push(error.message);
				}
			);
		});
		const frontend = load(path.join(pair.frontend.root, 'test/frontend/run.cjs'));
		const consumer = async (name, file) => {
			const context = await provider.context();
			const result = await frontend.run({
				suite: 'integration',
				directory: path.join(directory, name),
				testPaths: [path.join(pair.frontend.root, 'src/test/integration-contracts', file)],
				transport: {
					mode: 'real-loopback',
					context,
					verifyOwnership: async () => provider.context(),
				},
				coverage: !!options.coverage,
				handles: true,
			});
			const stage = {
				name,
				...result,
				openHandlesMeasured: true,
				openHandleCount: null,
				requiredFlows:
					name === 'frontend-app' ? selected.filter(flow => flow !== 'rest') : ['rest'],
				completedFlows: [],
			};
			stages.push(stage);
			const resultFile = path.join(directory, name, 'jest-result.json');
			const raw = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile)) : null;
			if (Array.isArray(raw?.openHandles)) stage.openHandleCount = raw.openHandles.length;
			const observationFile = path.join(
				directory,
				name,
				name === 'frontend-app' ? 'app-observations.json' : 'transport-observations.json'
			);
			const observed = fs.existsSync(observationFile)
				? JSON.parse(fs.readFileSync(observationFile))
				: null;
			if (name === 'frontend-app') stage.completedFlows = observed?.completed;
			else if (observed?.realXhr === true && observed?.realWebSocket === true)
				stage.completedFlows = ['rest'];
			if (!acceptedFrontend(stage))
				throw new Error(`INT ${name} failed its actual guarded consumer acceptance`);
		};
		await consumer('frontend-transport', 'transport.test.js');
		if (selected.some(flow => flow !== 'rest') && !interrupted)
			await consumer('frontend-app', 'frontend/app/paired.test.js');
		if (interrupted) throw new Error('INT run interrupted');
		const snapshot = await provider.control('snapshot');
		fs.writeFileSync(
			path.join(directory, 'observed-provider.json'),
			JSON.stringify(snapshot, null, 2)
		);
		const after = checkPair(options);
		if (
			after.backend.workingOverlay !== pair.backend.workingOverlay ||
			after.frontend.workingOverlay !== pair.frontend.workingOverlay
		)
			throw new Error('INT source overlays changed during execution');
	} catch (error) {
		errors.push(error.stack || error.message);
	} finally {
		watcher?.close();
		await Promise.all(
			Array.from(jobs).map(job =>
				job.catch(error => {
					errors.push(error.message);
				})
			)
		);
		try {
			await provider?.close();
		} catch (error) {
			errors.push(error.message, ...(error.errors?.map(value => value.message) || []));
		}
		process.removeListener('SIGINT', interrupt);
		process.removeListener('SIGTERM', interrupt);
	}
	let coverage;
	if (options.coverage && provider) {
		try {
			coverage = collectCoverage(pair, directory, stages);
		} catch (error) {
			errors.push(error.message);
		}
	}
	const report = {
		version: 1,
		scope: 'paired-integration',
		selectedFlows: selected,
		openHandleDiagnosticsRequired: true,
		node: process.version,
		platform: process.platform,
		architecture: process.arch,
		commands: process.argv,
		startedAt,
		finishedAt: new Date().toISOString(),
		installed,
		coverage,
		artifacts: {
			report: 'report.json',
			providerObservation: 'observed-provider.json',
			coverage: coverage ? 'coverage.json' : null,
			consumers: stages.map(stage => ({
				name: stage.name,
				report: `${stage.name}/report.json`,
				jest: `${stage.name}/jest-result.json`,
				observations: `${stage.name}/${
					stage.name === 'frontend-app' ? 'app' : 'transport'
				}-observations.json`,
			})),
			privateExcluded: [
				'authorization records',
				'int-rpc mailbox records',
				'home/tmp/cache directories',
			],
		},
		pair,
		stages,
		resources: provider?.report(),
		errors,
		success:
			!interrupted &&
			errors.length === 0 &&
			stages.length > 0 &&
			stages.every(acceptedFrontend),
	};
	fs.writeFileSync(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
	process.stdout.write(`Report: ${path.join(directory, 'report.json')}\n`);
	return report;
};

module.exports = { parse, acceptedFrontend, run, reportPath };
if (require.main === module) {
	Promise.resolve()
		.then(() => run(parse(process.argv.slice(2))))
		.then(
			report => {
				if (!report.success) process.exitCode = 1;
			},
			error => {
				process.stderr.write(`${error.stack}\n`);
				process.exitCode = 1;
			}
		);
}
