require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/config/db");
const http = require("http");
const { initSocket } = require("./src/utils/socket");

const port = process.env.PORT || 3000;

connectToDB()
  .then(() => {
    // Create HTTP server using Express app
    const server = http.createServer(app);

    // Initialize Socket.IO using the shared utility
    const io = initSocket(server);

    // Make io globally available for controllers (e.g., message.controller.js)
    global.io = io;

    server.listen(port, () => {
      console.log(`Server is running on port : ${port}`);
    });
  })
  .catch((err) => {
    console.log("Failed to Connect ❌", err);
  });