const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
