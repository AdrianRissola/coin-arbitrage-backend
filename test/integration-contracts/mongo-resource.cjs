const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { MongoClient } = require('mongoose').mongo;
const { verifyOwnedContainer } = require('../backend/support/disposable-mongo.cjs');
const { verifyContainer } = require('./ownership.cjs');
const harness = require('../fixtures/contracts/v1/harness-interface.json');

const createMongoResource = directory => {
	const root = fs.realpathSync(directory);
	const owner = {
		version: 1,
		runId: `int_${crypto.randomBytes(12).toString('hex')}`,
		token: crypto.randomBytes(32).toString('hex'),
		reportRoot: root,
		imageTag: 'mongo:4.4.1',
		created: false,
		removed: false,
	};
	owner.name = `coin-arb-${owner.runId}`;
	const save = () =>
		fs.writeFileSync(path.join(root, 'mongo-ownership.json'), JSON.stringify(owner, null, 2), {
			mode: 0o600,
		});
	let command;
	const inspect = () => {
		const value = JSON.parse(command(['container', 'inspect', owner.containerId]))[0];
		return {
			id: value.Id,
			name: value.Name.replace(/^\//, ''),
			imageId: value.Image,
			labels: value.Config.Labels || {},
			readOnly: value.HostConfig.ReadonlyRootfs,
			mounts: value.Mounts,
			tmpfs: value.HostConfig.Tmpfs || {},
			bindings: value.HostConfig.PortBindings,
			ports: value.NetworkSettings.Ports,
			running: value.State.Running,
		};
	};
	const close = () => {
		if (owner.createAttempted && !owner.containerId) {
			const ids = command([
				'ps',
				'-a',
				'--no-trunc',
				'--filter',
				`name=^/${owner.name}$`,
				'--filter',
				`label=coin-arbitrage-test.owner=${owner.token}`,
				'--format',
				'{{.ID}}',
			])
				.trim()
				.split('\n')
				.filter(Boolean);
			if (ids.length > 1) throw new Error('Ambiguous INT create ownership; refusing cleanup');
			if (ids.length) {
				[owner.containerId] = ids;
				owner.created = true;
			}
		}
		if (!owner.containerId || owner.removed) return;
		try {
			const metadata = verifyOwnedContainer(inspect(), owner);
			if (metadata.labels[harness.ownershipLabel] !== owner.runId)
				throw new Error('INT cleanup run label mismatch');
			if (metadata.running) command(['stop', '--time', '5', owner.containerId]);
			command(['rm', owner.containerId]);
			if (
				command([
					'ps',
					'-a',
					'--no-trunc',
					'--filter',
					`id=${owner.containerId}`,
					'--format',
					'{{.ID}}',
				]).trim()
			)
				throw new Error('INT exact-ID cleanup did not remove the owned container');
			owner.removed = true;
		} finally {
			save();
		}
	};
	return {
		owner,
		inspect,
		close,
		start: async () => {
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
				throw new Error('INT requires a local Unix Docker daemon');
			fs.mkdirSync(path.join(root, 'docker'), { mode: 0o700 });
			fs.mkdirSync(path.join(root, 'home'), { mode: 0o700 });
			const env = {
				PATH: process.env.PATH,
				HOME: path.join(root, 'home'),
				DOCKER_CONFIG: path.join(root, 'docker'),
				DOCKER_HOST: endpoint,
			};
			command = args =>
				cp.execFileSync('docker', args, {
					env,
					encoding: 'utf8',
					timeout: 20000,
					maxBuffer: 2 * 1024 * 1024,
				});
			const image = JSON.parse(command(['image', 'inspect', owner.imageTag]))[0];
			if (
				!/^sha256:[a-f0-9]{64}$/.test(image.Id) ||
				!image.RepoTags?.includes(owner.imageTag)
			)
				throw new Error('INT requires the already cached MongoDB 4.4.1 image');
			owner.imageId = image.Id;
			owner.imageDigests = image.RepoDigests;
			owner.architecture = image.Architecture;
			owner.createAttempted = true;
			save();
			owner.containerId = command([
				'create',
				'--name',
				owner.name,
				'--pull=never',
				'--label',
				`coin-arbitrage-test.owner=${owner.token}`,
				'--label',
				`coin-arbitrage-test.root=${root}`,
				'--label',
				'coin-arbitrage-test.scope=backend-persistence',
				'--label',
				`${harness.ownershipLabel}=${owner.runId}`,
				'--publish',
				'127.0.0.1::27017',
				'--read-only',
				'--user',
				'999:999',
				'--cap-drop',
				'ALL',
				'--security-opt',
				'no-new-privileges',
				'--memory',
				'1g',
				'--pids-limit',
				'128',
				'--tmpfs',
				'/data/db:rw,nosuid,nodev,size=512m,uid=999,gid=999',
				'--tmpfs',
				'/data/configdb:rw,nosuid,nodev,size=16m,uid=999,gid=999',
				'--tmpfs',
				'/tmp:rw,nosuid,nodev,size=32m,mode=1777',
				'--entrypoint',
				'mongod',
				owner.imageId,
				'--bind_ip_all',
				'--port',
				'27017',
				'--wiredTigerCacheSizeGB',
				'0.25',
			]).trim();
			if (!/^[a-f0-9]{64}$/.test(owner.containerId))
				throw new Error('Docker did not issue an exact INT ID');
			owner.created = true;
			save();
			command(['start', owner.containerId]);
			const port = verifyContainer(inspect(), owner);
			owner.mongoUri = `mongodb://127.0.0.1:${port}/${harness.mongoDatabasePrefix}${owner.runId}`;
			owner.mongoPort = port;
			const client = new MongoClient(owner.mongoUri, {
				directConnection: true,
				family: 4,
				maxPoolSize: 1,
				connectTimeoutMS: 1000,
				serverSelectionTimeoutMS: 15000,
				retryWrites: false,
				retryReads: false,
			});
			try {
				await client.connect();
				owner.serverVersion = (await client.db('admin').command({ buildInfo: 1 })).version;
				if (owner.serverVersion !== '4.4.1')
					throw new Error('INT MongoDB server version mismatch');
			} finally {
				await client.close();
			}
			owner.ready = true;
			save();
			return { ...owner };
		},
		report: () => {
			const value = { ...owner };
			delete value.token;
			return value;
		},
	};
};

module.exports = { createMongoResource };
