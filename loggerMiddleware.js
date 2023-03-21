const { env } = process;
const allowedOrigins =
	env.NODE_ENV !== 'production'
		? JSON.parse(env.LOCAL_ALLOWED_ORIGINS)
		: JSON.parse(env.PROD_ALLOWED_ORIGINS);
const logger = (request, response, next) => {
	const { origin } = request.headers;
	if (allowedOrigins.includes(origin)) {
		// Website you wish to allow to connect
		response.setHeader('Access-Control-Allow-Origin', origin);
	}

	// Request methods you wish to allow
	response.setHeader('Access-Control-Allow-Methods', 'GET');

	// Request headers you wish to allow
	response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	response.setHeader('Access-Control-Allow-Credentials', true);

	console.log('request.method: ', request.method);
	console.log('request.path: ', request.path);
	console.log('request.originalUrl: ', request.originalUrl);
	console.log('request.body: ', request.body);
	console.log('request.params: ', request.params);
	console.log('request.query: ', request.query);
	console.log('------');
	next();
};

module.exports = logger;
