const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { MongoClient } = require('mongoose').mongo;
const { validateAuthorization } = require('./mongo-scope.cjs');

const verifyOwnedContainer = (metadata, owner) => {
	if (
		metadata.id !== owner.containerId ||
		metadata.name !== owner.name ||
		metadata.imageId !== owner.imageId ||
		metadata.labels['coin-arbitrage-test.owner'] !== owner.token ||
		metadata.labels['coin-arbitrage-test.root'] !== owner.reportRoot ||
		metadata.labels['coin-arbitrage-test.scope'] !== 'backend-persistence' ||
		metadata.readOnly !== true ||
		metadata.mounts.some(mount => mount.Type !== 'tmpfs') ||
		!['/data/db', '/data/configdb', '/tmp'].every(target => metadata.tmpfs[target]) ||
		metadata.bindings?.['27017/tcp']?.length !== 1 ||
		metadata.bindings['27017/tcp'][0].HostIp !== '127.0.0.1'
	)
		throw new Error(
			'Disposable MongoDB ownership verification failed; refusing resource action'
		);
	return metadata;
};
const createDisposableMongo = directory => {
	const reportRoot = fs.realpathSync(directory);
	const owner = {
		version: 1,
		reportRoot,
		token: crypto.randomBytes(32).toString('hex'),
		name: `coin-arb-b5-${crypto.randomBytes(8).toString('hex')}`,
		databasePrefix: `be_test_${crypto.randomBytes(8).toString('hex')}`,
		imageTag: 'mongo:4.4.1',
		created: false,
		removed: false,
	};
	let command;
	const save = () =>
		fs.writeFileSync(
			path.join(reportRoot, 'mongo-ownership.json'),
			`${JSON.stringify(owner, null, 2)}\n`,
			{ mode: 0o600 }
		);
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
		if (owner.createAttempted && !/^[a-f0-9]{64}$/.test(owner.containerId || '')) {
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
			if (ids.length > 1)
				throw new Error('Ambiguous newly issued MongoDB ownership; refusing cleanup');
			if (ids.length) {
				[owner.containerId] = ids;
				owner.created = true;
			}
		}
		if (!owner.containerId || owner.removed) return;
		try {
			const metadata = verifyOwnedContainer(inspect(), owner);
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
				throw new Error('Owned MongoDB container still exists after exact-ID cleanup');
			owner.removed = true;
			owner.removedAt = new Date().toISOString();
		} finally {
			save();
		}
	};
	return {
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
				throw new Error('Persistence tests require a local Unix Docker daemon');
			fs.mkdirSync(path.join(reportRoot, 'docker'), { mode: 0o700 });
			const env = {
				PATH: process.env.PATH,
				HOME: path.join(reportRoot, 'home'),
				DOCKER_CONFIG: path.join(reportRoot, 'docker'),
				DOCKER_HOST: endpoint,
			};
			command = args =>
				cp.execFileSync('docker', args, {
					env,
					encoding: 'utf8',
					timeout: 20000,
					maxBuffer: 2 * 1024 * 1024,
				});
			save();
			const image = JSON.parse(command(['image', 'inspect', owner.imageTag]))[0];
			if (
				!/^sha256:[a-f0-9]{64}$/.test(image.Id) ||
				!image.RepoTags?.includes(owner.imageTag)
			)
				throw new Error('Required cached MongoDB 4.4.1 image could not be verified');
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
				`coin-arbitrage-test.root=${reportRoot}`,
				'--label',
				'coin-arbitrage-test.scope=backend-persistence',
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
				'--setParameter',
				'enableTestCommands=1',
			]).trim();
			if (!/^[a-f0-9]{64}$/.test(owner.containerId))
				throw new Error('Docker did not issue an exact container ID');
			owner.created = true;
			save();
			command(['start', owner.containerId]);
			const metadata = verifyOwnedContainer(inspect(), owner);
			const bindings = metadata.ports?.['27017/tcp'];
			if (!metadata.running || bindings?.length !== 1 || bindings[0].HostIp !== '127.0.0.1')
				throw new Error('New MongoDB listener is not exclusively loopback owned');
			const authorization = validateAuthorization(reportRoot, {
				version: 1,
				scope: 'owned-disposable-mongo',
				reportRoot,
				token: owner.token,
				containerId: owner.containerId,
				imageId: owner.imageId,
				host: '127.0.0.1',
				port: Number(bindings[0].HostPort),
				databasePrefix: owner.databasePrefix,
				uri: `mongodb://127.0.0.1:${bindings[0].HostPort}/${owner.databasePrefix}`,
			});
			const client = new MongoClient(authorization.uri, {
				directConnection: true,
				family: 4,
				serverSelectionTimeoutMS: 15000,
				connectTimeoutMS: 1000,
				maxPoolSize: 1,
				retryWrites: false,
				retryReads: false,
			});
			try {
				await client.connect();
				owner.serverVersion = (await client.db('admin').command({ buildInfo: 1 })).version;
				if (owner.serverVersion !== '4.4.1')
					throw new Error('Disposable MongoDB server version differs from 4.4.1');
			} finally {
				await client.close();
			}
			owner.authorization = authorization;
			owner.ready = true;
			save();
			return authorization;
		},
		close,
		report: () => ({ ...owner }),
	};
};

module.exports = { createDisposableMongo, verifyOwnedContainer };
