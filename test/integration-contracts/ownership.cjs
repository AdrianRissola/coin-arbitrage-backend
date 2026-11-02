const { verifyOwnedContainer } = require('../backend/support/disposable-mongo.cjs');
const { createTestEnvironment } = require('./context.cjs');
const harness = require('../fixtures/contracts/v1/harness-interface.json');

const verifyContainer = (metadata, owner) => {
	verifyOwnedContainer(metadata, owner);
	const bindings = metadata.ports?.['27017/tcp'];
	if (
		!/^[A-Za-z0-9_-]{1,40}$/.test(owner.runId || '') ||
		!/^[a-f0-9]{64}$/.test(owner.token || '') ||
		!/^sha256:[a-f0-9]{64}$/.test(owner.imageId || '') ||
		!/^[a-f0-9]{64}$/.test(owner.containerId || '') ||
		metadata.labels[harness.ownershipLabel] !== owner.runId ||
		owner.imageTag !== 'mongo:4.4.1' ||
		metadata.running !== true ||
		bindings?.length !== 1 ||
		bindings[0].HostIp !== '127.0.0.1' ||
		!Number.isInteger(Number(bindings[0].HostPort)) ||
		Number(bindings[0].HostPort) < 1024 ||
		Number(bindings[0].HostPort) > 65535 ||
		[3000, 3001, 27017].includes(Number(bindings[0].HostPort))
	)
		throw new Error('INT live MongoDB ownership or binding mismatch');
	return Number(bindings[0].HostPort);
};
const createContext = (metadata, owner, binding, pair) => {
	const mongoPort = verifyContainer(metadata, owner);
	if (
		binding.runId !== owner.runId ||
		binding.token !== owner.token ||
		!Number.isInteger(owner.pid) ||
		owner.pid <= 0 ||
		binding.pid !== owner.pid ||
		binding.listening !== true ||
		binding.address !== '127.0.0.1' ||
		binding.family !== 'IPv4' ||
		!Number.isInteger(binding.port)
	)
		throw new Error('INT owned provider listener is not live');
	const context = {
		protocolVersion: 1,
		runId: owner.runId,
		token: owner.token,
		fixtureDigest: pair.fixtureDigest,
		backendRevision: pair.backend.head,
		frontendRevision: pair.frontend.head,
		restEndpoint: `http://127.0.0.1:${binding.port}/`,
		websocketEndpoint: `ws://127.0.0.1:${binding.port}/`,
		origin: 'http://localhost:3000',
		mongoUri: `mongodb://127.0.0.1:${mongoPort}/${harness.mongoDatabasePrefix}${owner.runId}`,
		containerId: metadata.id,
		ownerLabel: metadata.labels[harness.ownershipLabel],
	};
	createTestEnvironment({ mode: harness.integrationMode, context, expected: { ...context } });
	return Object.freeze(context);
};

module.exports = { verifyContainer, createContext };
