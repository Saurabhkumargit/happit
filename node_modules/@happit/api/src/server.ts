import app from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
console.log(`Happit API running on port ${PORT}`);
});
