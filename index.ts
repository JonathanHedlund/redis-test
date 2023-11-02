import express from "express";

const app = express();

app.get("/photos", async (req, res) => {
	const albumId = req.query.albumId;
	const response = await fetch(
		`https://jsonplaceholder.typicode.com/photos?albumId=${albumId}`
	);
	const photos = await response.json();
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
