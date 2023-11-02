import express from "express";
import cors from "cors";
import Redis, { RedisClientType } from "redis";

const redisClient = Redis.createClient() as RedisClientType;

const DEFAULT_EXPIRATION = 3600;

await redisClient.connect();

const cacheCheck =
	(redisClient: RedisClientType, key: string, queryParam?: string) =>
	async (
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		const params = req.params.id || "";
		try {
			const cacheKey = `${key}${
				queryParam ? `_query-${queryParam}:${req.query[`${queryParam}`]}` : ""
			}${params ? `_params:${params}` : ""}`;
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

app.get(
	"/photos",
	cacheCheck(redisClient, `photos`, "albumId"),
	async (req, res) => {
		console.log("Cashe Miss");
		const albumId = req.query.albumId;
		const response = await fetch(
			`https://jsonplaceholder.typicode.com/photos?albumId=${albumId}`
		);
		const photos = await response.json();
		redisClient.setEx(
			`photos_query-albumId:${albumId}`,
			DEFAULT_EXPIRATION,
			JSON.stringify(photos)
		);
		res.json(photos);
	}
);

app.get("/photos/:id", cacheCheck(redisClient, "photo"), async (req, res) => {
	console.log("Cashe Miss");
	const id = req.params.id;
	const response = await fetch(
		`https://jsonplaceholder.typicode.com/photos/${id}`
	);
	const photo = await response.json();
	redisClient.setEx(
		`photo_params:${id}`,
		DEFAULT_EXPIRATION,
		JSON.stringify(photo)
	);
	res.json(photo);
});

app.listen(3000, () => {
	console.log("Example app listening on port 3000!");
});
