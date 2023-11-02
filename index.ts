import express from "express";
import cors from "cors";
import Redis, { RedisClientType } from "redis";

const redisClient = Redis.createClient() as RedisClientType;

const DEFAULT_EXPIRATION = 3600;

await redisClient.connect();

const cacheKeyGenerator = (
	key: string,
	queryParams?: { [key: string]: string },
	params?: { [key: string]: string }
) => {
	const queryParamKeys = queryParams ? Object.keys(queryParams) : [];
	const paramsKeys = params ? Object.keys(params) : [];
	const cacheKey = `${key}${
		queryParamKeys.length > 0 && queryParams
			? `_query-${queryParamKeys.map((key) => `${key}:${queryParams[key]}`)}`
			: ""
	}${
		paramsKeys.length > 0 && params
			? `_params-${paramsKeys.map((key) => `${key}:${params[key]}`)}`
			: ""
	}`;
	return cacheKey;
};

const cacheCheck =
	(redisClient: RedisClientType, key: string) =>
	async (
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		try {
			const stringQueryParams: { [key: string]: string } = {};
			Object.keys(req.query).forEach((key) => {
				if (typeof req.query[key] === "string") {
					stringQueryParams[key] = req.query[key] as string;
				}
			});
			const cacheKey = cacheKeyGenerator(key, stringQueryParams, req.params);
			console.log(cacheKey);
			const cachedData = await redisClient.get(cacheKey);
			if (cachedData !== null) {
				console.log("Cashe Hit");
				res.send(JSON.parse(cachedData));
			} else {
				next();
			}
		} catch (error) {
			res.send(error);
		}
	};

const app = express();

app.use(cors());

app.get("/photos", cacheCheck(redisClient, `photos`), async (req, res) => {
	console.log("Cashe Miss");
	const response = await fetch(
		`https://jsonplaceholder.typicode.com/photos?${
			new URL("s://" + req.url).search
		}
		).toString()}}`
	);
	const photos = await response.json();

	const stringQueryParams: { [key: string]: string } = {};
	Object.keys(req.query).forEach((key) => {
		if (typeof req.query[key] === "string") {
			stringQueryParams[key] = req.query[key] as string;
		}
	});
	const cacheKey = cacheKeyGenerator(`photos`, stringQueryParams);
	redisClient.setEx(cacheKey, DEFAULT_EXPIRATION, JSON.stringify(photos));
	res.json(photos);
});

app.get("/photos/:id", cacheCheck(redisClient, "photo"), async (req, res) => {
	console.log("Cashe Miss");
	const id = req.params.id;
	const response = await fetch(
		`https://jsonplaceholder.typicode.com/photos/${id}`
	);
	const photo = await response.json();
	redisClient.setEx(
		`photo_params-id:${id}`,
		DEFAULT_EXPIRATION,
		JSON.stringify(photo)
	);
	res.json(photo);
});

app.listen(3000, () => {
	console.log("Example app listening on port 3000!");
});
