const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB connect
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://<user>:<pass>@cluster/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const QuestionSchema = new mongoose.Schema({
  _id: String,
  questions: [String]
});
const Question = mongoose.model("Question", QuestionSchema);

// ✅ GitHub raw file links (তোমার GitHub repo এর link এখানে দাও)
const githubTruthURL = "https://raw.githubusercontent.com/<your-github-user>/<your-repo>/main/truth.json";
const githubDareURL = "https://raw.githubusercontent.com/<your-github-user>/<your-repo>/main/dare.json";

// 🧠 Update MongoDB from GitHub
async function updateFromGitHub() {
  try {
    const [truthRes, dareRes] = await Promise.all([
      axios.get(githubTruthURL),
      axios.get(githubDareURL)
    ]);

    const truth = truthRes.data;
    const dare = dareRes.data;

    await Question.findByIdAndUpdate("truth", { questions: truth }, { upsert: true });
    await Question.findByIdAndUpdate("dare", { questions: dare }, { upsert: true });

    console.log("✅ GitHub data synced to MongoDB.");
  } catch (err) {
    console.error("⚠️ GitHub sync failed:", err.message);
  }
}

// 🔁 Sync on start + every 6 hours
updateFromGitHub();
setInterval(updateFromGitHub, 1000 * 60 * 60 * 6);

// ✅ Endpoint to get question
app.get("/truthdare/:type", async (req, res) => {
  const { type } = req.params;
  if (!["truth", "dare"].includes(type))
    return res.status(400).json({ error: "Invalid type" });

  try {
    const doc = await Question.findById(type);
    if (!doc) return res.status(404).json({ error: "Not found" });

    const random = doc.questions[Math.floor(Math.random() * doc.questions.length)];
    return res.json({ question: random });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧩 Manual sync route (optional)
app.get("/update", async (req, res) => {
  await updateFromGitHub();
  res.send("✅ Updated from GitHub!");
});

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🎯 Truth or Dare API is running successfully!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
