const mongoose = require("mongoose");
const userModel = require("./src/models/user.model");
const conversationModel = require("./src/models/conversation.model");

async function cleanup() {
  try {
    await mongoose.connect(process.env.MOGNODB_URL || process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    const lovyId = "69b55430563f4e94b64e444a";
    const convos = await conversationModel.find({ 
      participants: lovyId,
      isGroup: false 
    });
    
    console.log(`Found ${convos.length} conversations for Lovy:`);
    convos.forEach(c => {
      console.log(`- ID: ${c._id}, Participants: ${c.participants}, updatedAt: ${c.updatedAt}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
