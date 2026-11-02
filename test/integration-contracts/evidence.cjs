const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { fileURLToPath } = require('node:url');

const installedVersions = pair =>
	Object.fromEntries(
		['backend', 'frontend'].map(role => {
			const load = createRequire(path.join(pair[role].root, 'package.json'));
			const names =
				role === 'backend'
					? ['jest', 'mongoose', 'mongodb', 'websocket', 'express']
					: [
							'jest',
							'react',
							'react-dom',
							'react-scripts',
							'axios',
							'@testing-library/react',
					  ];
			return [
				role,
				Object.fromEntries(names.map(name => [name, load(`${name}/package.json`).version])),
			];
		})
	);
const istanbulSummary = files => {
	if (!files || !Object.keys(files).length) throw new Error('Empty actual frontend coverage');
	return Object.fromEntries(
		[
			['statements', 's'],
			['functions', 'f'],
			['branches', 'b'],
		].map(([name, key]) => {
			const values = Object.values(files).flatMap(file => Object.values(file[key]).flat());
			if (values.some(value => !Number.isInteger(value) || value < 0))
				throw new Error('Invalid actual frontend coverage counter');
			const covered = values.filter(value => value > 0).length;
			return [
				name,
				{
					total: values.length,
					covered,
					percent: values.length ? (100 * covered) / values.length : 100,
				},
			];
		})
	);
};
const v8Summary = (scripts, root) => {
	const files = new Map();
	scripts.forEach(script => {
		if (!script.url.startsWith('file:')) return;
		const relative = path.relative(root, fileURLToPath(script.url)).split(path.sep).join('/');
		if (
			relative.startsWith('../') ||
			path.isAbsolute(relative) ||
			relative.startsWith('node_modules/') ||
			relative.startsWith('test/') ||
			!relative.endsWith('.js')
		)
			return;
		if (!files.has(relative)) files.set(relative, new Map());
		script.functions.forEach(fn => {
			const range = fn.ranges[0];
			if (!range || !Number.isInteger(range.count) || range.count < 0)
				throw new Error('Invalid actual backend coverage counter');
			const key = `${range.startOffset}:${range.endOffset}`;
			files.get(relative).set(key, files.get(relative).get(key) || range.count > 0);
		});
	});
	if (!files.size) throw new Error('No loaded backend source coverage');
	const details = Array.from(files, ([file, counts]) => ({
		file,
		functions: counts.size,
		coveredFunctions: Array.from(counts.values()).filter(Boolean).length,
	})).sort((left, right) => left.file.localeCompare(right.file));
	return {
		metric: 'native V8 functions in loaded backend app scripts only; not statements or complete-tree coverage',
		loadedScripts: details.length,
		functions: details.reduce((total, file) => total + file.functions, 0),
		coveredFunctions: details.reduce((total, file) => total + file.coveredFunctions, 0),
		files: details,
	};
};
const collectCoverage = (pair, directory, stages) => {
	const nativeDirectory = path.join(directory, 'provider/v8-coverage');
	const scripts = fs
		.readdirSync(nativeDirectory)
		.filter(name => name.endsWith('.json'))
		.flatMap(name => JSON.parse(fs.readFileSync(path.join(nativeDirectory, name))).result);
	const result = {
		backend: v8Summary(scripts, pair.backend.root),
		frontend: Object.fromEntries(
			stages.map(stage => [
				stage.name,
				istanbulSummary(
					JSON.parse(
						fs.readFileSync(
							path.join(directory, stage.name, 'coverage/coverage-final.json')
						)
					)
				),
			])
		),
		profilesMerged: false,
	};
	fs.writeFileSync(path.join(directory, 'coverage.json'), JSON.stringify(result, null, 2));
	return result;
};

module.exports = { installedVersions, istanbulSummary, v8Summary, collectCoverage };
