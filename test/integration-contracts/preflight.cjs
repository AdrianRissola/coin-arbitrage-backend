const path = require('node:path');
const { checkPair } = require('./pair.cjs');

const parse = argv => {
	const args = argv.slice();
	const options = { backendDir: path.resolve(__dirname, '../..') };
	const keys = {
		'--frontend-dir': 'frontendDir',
		'--backend-rev': 'backendRevision',
		'--frontend-rev': 'frontendRevision',
	};
	while (args.length) {
		const flag = args.shift();
		const value = args.shift();
		if (!keys[flag] || !value || value.startsWith('--'))
			throw new Error('Invalid INT preflight arguments');
		options[keys[flag]] = value;
	}
	if (!options.frontendDir) throw new Error('An explicit pinned frontend directory is required');
	return options;
};

module.exports = { parse };
if (require.main === module) {
	try {
		const pair = checkPair(parse(process.argv.slice(2)));
		process.stdout.write(
			`${JSON.stringify(
				{
					scope: 'I0 source/fixture preflight only; no live resource or paired-flow claim.',
					...pair,
				},
				null,
				2
			)}\n`
		);
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
