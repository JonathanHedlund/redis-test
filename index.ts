import express from "express";
import cors from "cors";
import Redis from "redis";
import util from "util";

const redisClient = Redis.createClient();

const DEFAULT_EXPIRATION = 3600;

const getAsync = util.promisify(redisClient.get).bind(redisClient);

await redisClient.connect();

const redisMiddleware = async (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction
) => {
	try {
		const cachedData = await redisClient.get(
			`photos?albumId=${req.query.albumId}`
		);
		if (cachedData !== null) {
			console.log("Cashe hit");
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

app.get("/photos", redisMiddleware, async (req, res) => {
	console.log("Cashe Miss");
	const albumId = req.query.albumId;
	const response = await fetch(
		`https://jsonplaceholder.typicode.com/photos?albumId=${albumId}`
	);
	const photos = await response.json();
	redisClient.setEx(
		`photos?albumId=${albumId}`,
		DEFAULT_EXPIRATION,
		JSON.stringify(photos)
	);
	res.json(photos);
});

app.get("/photos/:id", async (req, res) => {
	const id = req.params.id;
	const response = await fetch(
		`https://jsonplaceholder.typicode.com/photos/${id}`
	);
	const photo = await response.json();
	res.json(photo);
});

app.listen(3000, () => {
	console.log("Example app listening on port 3000!");
});
