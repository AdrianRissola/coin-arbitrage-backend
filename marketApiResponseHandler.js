const errorHelper = require('./errorHelper');

const isString = value => {
	let isStringValue = false;
	if (typeof value === 'string') isStringValue = true;
	return isStringValue;
};

exports.extractNumberFromTickerTarget = (pathToNumber, tickerTarget, config) => {
	let numberField = null;
	if (tickerTarget) {
		numberField = tickerTarget;
		pathToNumber.some(fieldPath => {
			let field = fieldPath;
			if (isString(fieldPath) && fieldPath.includes('${ticker}.'))
				field = fieldPath.replace(
					fieldPath,
					config.marketTickerName.split(config.tickerSeparator)[fieldPath.split('.')[1]]
				);
			else if (fieldPath === '${ticker}')
				field = fieldPath.replace('${ticker}', config.marketTickerName);
			numberField = numberField[field];
			return !numberField;
		});
	}

	const number = Number(numberField);

	if (!numberField || !number)
		throw errorHelper.errors.BAD_REQUEST(
			`Error when try to extract field from target using pathToField: ${pathToNumber}`
		);

	return number;
};
