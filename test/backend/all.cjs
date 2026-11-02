const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { createTestEnvironment } = require('../integration-contracts/context.cjs');

const profiles = Object.freeze(['offline', 'api', 'websocket-wire', 'persistence']);
const profileAccepted = (name, result, report) =>
	Boolean(
		result.childCode === 0 &&
			!result.signal &&
			report?.version === 1 &&
			report.scope === name &&
			report.success === true &&
			Array.isArray(report.stages) &&
			report.stages.length > 0 &&
			report.stages.every(
				stage =>
					stage.success === true &&
					!stage.signal &&
					!stage.timedOut &&
					!stage.failedTests &&
					Number.isInteger(stage.totalTests) &&
					Number.isInteger(stage.passedTests) &&
					stage.totalTests > 0 &&
					stage.passedTests > 0 &&
					stage.passedTests <= stage.totalTests
			) &&
			(name !== 'persistence' ||
				(report.persistence?.created === true &&
					report.persistence?.ready === true &&
					report.persistence?.removed === true))
	);
const runAll = async options => {
	const root = path.resolve(__dirname, '../..');
	const directory = options.directory
		? path.resolve(options.directory)
		: fs.mkdtempSync(path.join(os.tmpdir(), 'coin-arbitrage-be-all-'));
	if (options.directory) fs.mkdirSync(directory, { mode: 0o700 });
	['home', 'tmp', 'cache'].forEach(name => fs.mkdirSync(path.join(directory, name)));
	const endpoint =
		process.env.DOCKER_HOST ||
		cp
			.execFileSync(
				'docker',
				['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
				{ encoding: 'utf8', timeout: 15000 }
			)
			.trim();
	if (!endpoint.startsWith('unix://'))
		throw new Error('All profiles require the explicitly local Unix Docker daemon');
	const env = {
		...createTestEnvironment(),
		PATH: process.env.PATH,
		HOME: path.join(directory, 'home'),
		TMPDIR: path.join(directory, 'tmp'),
		TEST_BOOTSTRAP_TMPDIR: path.join(directory, 'tmp'),
		XDG_CACHE_HOME: path.join(directory, 'cache'),
		DOCKER_HOST: endpoint,
		TZ: 'UTC',
		CI: 'true',
		FORCE_COLOR: '0',
	};
	let child;
	let interrupted = false;
	const onInt = () => {
		interrupted = true;
		process.exitCode = 130;
		child?.kill('SIGINT');
	};
	const onTerm = () => {
		interrupted = true;
		process.exitCode = 143;
		child?.kill('SIGTERM');
	};
	process.once('SIGINT', onInt);
	process.once('SIGTERM', onTerm);
	const results = [];
	try {
		await profiles.reduce(
			(previous, name) =>
				previous.then(async () => {
					if (interrupted) return;
					const profileDirectory = path.join(directory, name);
					const args = [
						path.join(__dirname, 'run.cjs'),
						'--suite',
						name,
						'--report-dir',
						profileDirectory,
					];
					if (options.coverage) args.push('--coverage');
					if (options.handles) args.push('--detect-open-handles');
					if (options.image && name === 'persistence')
						args.push('--image', options.image);
					const result = await new Promise(resolve => {
						child = cp.spawn(process.execPath, args, {
							cwd: root,
							env,
							stdio: ['ignore', 'pipe', 'pipe'],
						});
						let stdout = '';
						let stderr = '';
						child.stdout.on('data', data => {
							stdout += data;
						});
						child.stderr.on('data', data => {
							stderr += data;
						});
						child.once('error', error => {
							stderr += error.message;
						});
						child.once('close', (childCode, signal) => {
							child = null;
							fs.writeFileSync(path.join(directory, `${name}.log`), stdout + stderr);
							process.stdout.write(stdout.replace(/^Report:/gm, `${name} Report:`));
							process.stderr.write(stderr);
							resolve({ childCode, signal });
						});
					});
					const reportPath = path.join(profileDirectory, 'report.json');
					let report = null;
					if (fs.existsSync(reportPath))
						report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
					results.push({
						name,
						...result,
						reportPath,
						report,
						success: profileAccepted(name, result, report),
					});
				}),
			Promise.resolve()
		);
		const report = {
			version: 1,
			scope: 'all',
			node: process.version,
			profiles: results,
			success:
				!interrupted &&
				results.length === profiles.length &&
				results.every(result => result.success),
		};
		const file = path.join(directory, 'report.json');
		fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
		process.stdout.write(`Report: ${file}\n`);
		if (!report.success) process.exitCode = process.exitCode || 1;
		return report;
	} finally {
		process.removeListener('SIGINT', onInt);
		process.removeListener('SIGTERM', onTerm);
	}
};

module.exports = { runAll, profileAccepted };
