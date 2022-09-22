const errorHelper = require('./errorHelper');
const { isString } = require('./helper');

exports.extractNumberFromTarget = (pathToValue, target, config) => {
	let targetField = null;
	if (target) {
		targetField = target;
		pathToValue.some(fieldPath => {
			let field = fieldPath;
			if (isString(fieldPath) && fieldPath.includes('${ticker}.'))
				field = fieldPath.replace(
					fieldPath,
					config.marketTickerName.split(config.tickerSeparator)[fieldPath.split('.')[1]]
				);
			else if (fieldPath === '${ticker}')
				field = fieldPath.replace('${ticker}', config.marketTickerName);
			targetField = targetField[field];
			return !targetField;
		});
	}

	let validType = true;
	if (typeof config.tickerKeyIndex !== 'number') {
		if (config.valueType === 'number') targetField = Number(targetField);
		if (config.valueType === 'string') validType = isString(targetField);
	} else {
		targetField = Object.keys(targetField)[config.tickerKeyIndex];
	}

	if (!targetField || !validType)
		// TODO: refactor
		throw errorHelper.errors.BAD_REQUEST(
			`Error when try to extract value from target using pathToValue: ${pathToValue}`
		);

	return targetField;
};
