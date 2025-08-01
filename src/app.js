import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import urlRoutes from "./routes/shortul.route.js"

dotenv.config();

connectDb();

const app = express();

app.use(express.json());


app.use("/", urlRoutes);

const port = process.env.PORT || 5000;


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});