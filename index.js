const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://kibriaHossain:${process.env.DB_PASS}@cluster0.rv53t.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// =========== Database connection ===============
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("allTools").collection("tools");
    const reviewCollection = client.db("reviews").collection("review");

    // ---------- getting tools API --------------
    app.get("/get-tools", async (req, res) => {
      const result = await toolsCollection.find({}).toArray();
      res.send(result);
    });

    
  } finally {
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Electro-Parts here");
});

app.listen(port, () => {
  console.log("electro-parts are running in port", port);
});
