const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const MODELS_MAP = {
  admins: require("./models/Admin_Model"),
  departments: require("./models/Department_Model"),
  doctors: require("./models/Doctor_Model"),
  patients: require("./models/Patient_Model"),
  events: require("./models/Event_Model"),
  leaves: require("./models/Leave_Model"),
  medicines: require("./models/Medicine_Model"),
  tests: require("./models/Test_Model"),
  orders: require("./models/Order_Model"),
  feedbacks: require("./models/Feedback_Model"),
  appointments: require("./models/Appointment_Model"),
  
};

const seedDatabase = async () => {
  try {
    const MONGO_URI = "mongodb://localhost:27017/MedicoPlus";

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Database connection successful.");

    const dataPath = path.join(__dirname, "data.json");
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found at: ${dataPath}`);
    }

    const masterData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    for (const [JSON_DATA_KEY, TARGET_MODEL] of Object.entries(MODELS_MAP)) {
      const recordsToSeed = masterData[JSON_DATA_KEY];

      if (!recordsToSeed || !Array.isArray(recordsToSeed)) {
        console.warn(
          `Skipping "${JSON_DATA_KEY}" — invalid or missing array in data.json`,
        );
        continue;
      }

      console.log(
        `\nExtracted ${recordsToSeed.length} entries for [${JSON_DATA_KEY}]...`,
      );

      const bulkOperations = recordsToSeed.map((record) => {
        const documentData = { ...record };

        // Hash passwords for user-based collections
        const userKeys = ["admins", "doctors", "patients"];
        if (userKeys.includes(JSON_DATA_KEY) && documentData.password) {
          const salt = bcrypt.genSaltSync(10);
          documentData.password = bcrypt.hashSync(documentData.password, salt);
        }

        // Build query filter for idempotent upsert
        const queryFilter = {};
        if (documentData._id) {
          queryFilter._id = documentData._id;
        } else if (documentData.doctorId) {
          queryFilter.doctorId = documentData.doctorId;
        } else if (documentData.orderID) {
          queryFilter.orderID = documentData.orderID;
        } else if (documentData.email) {
          queryFilter.email = documentData.email;
        } else if (JSON_DATA_KEY === "appointments") {
          queryFilter.patientId = documentData.patientId;
          queryFilter.date = documentData.date;
          queryFilter.time = documentData.time;
        } else {
          queryFilter.name = documentData.name;
        }

        return {
          updateOne: {
            filter: queryFilter,
            update: { $set: documentData },
            upsert: true,
            runValidators: true,
          },
        };
      });

      console.log(
        `Executing idempotent bulk write on [${TARGET_MODEL.modelName}]...`,
      );
      const bulkWriteResult = await TARGET_MODEL.bulkWrite(bulkOperations);

      console.log("==================================================");
      console.log(` Seeding Results for [${TARGET_MODEL.modelName}]:`);
      console.log(`   Matched Rows: ${bulkWriteResult.matchedCount}`);
      console.log(`   Upserted (New): ${bulkWriteResult.upsertedCount}`);
      console.log(`   Modified Rows: ${bulkWriteResult.modifiedCount}`);
      
    }

    process.exit(0);
  } catch (error) {
    console.error("Critical Execution Interruption:", error.message);
    process.exit(1);
  }
};

seedDatabase();
