import express from "express";
import cors from "cors";
import Redis, { RedisClientType } from "redis";

const redisClient = Redis.createClient() as RedisClientType;

const DEFAULT_EXPIRATION = 3600;

await redisClient.connect();

const cacheKeyGenerator = (
	key: string,
	...keySections: { sectionLabel: string; value: { [key: string]: string } }[]
) => {
	const sections = keySections?.reduce((acc, { sectionLabel, value }) => {
		if (Object.keys(value).length > 0) {
			const sectionKeys = Object.keys(value).sort();
			const sectionString = sectionKeys
				.map((sectionKey) => `${sectionKey}:${value[sectionKey]}`)
				.join(",");
			acc.push(`_${sectionLabel}-${sectionString}`);
		}
		return acc;
	}, [] as string[]);
	return `${key}${sections && sections.length > 0 ? `${sections}` : ""}`;
};

const cacheCheck =
	(redisClient: RedisClientType, key: string) =>
	async (
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		try {
			const cacheKey = cacheKeyGenerator(
				key,
				{
					sectionLabel: "query",
					value: req.query as { [key: string]: string },
				},
				{
					sectionLabel: "params",
					value: req.params,
				}
			);
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
		`https://jsonplaceholder.typicode.com/photos${
			new URL("s://" + req.url).search
		}`
	);
	const photos = await response.json();

	const cacheKey = cacheKeyGenerator("photos", {
		sectionLabel: "query",
		value: req.query as { [key: string]: string },
	});

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
	const cacheKey = cacheKeyGenerator("photo", {
		sectionLabel: "params",
		value: req.params,
	});
	redisClient.setEx(cacheKey, DEFAULT_EXPIRATION, JSON.stringify(photo));
	res.json(photo);
});

app.listen(3000, () => {
	console.log("Example app listening on port 3000!");
});
