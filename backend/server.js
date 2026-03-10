require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/config/db");

const port = process.env.PORT || 3000;

connectToDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port : ${port}`);
    });
  })
  .catch((err) => {
    console.log("Failed to Connect ❌", err);
  });
