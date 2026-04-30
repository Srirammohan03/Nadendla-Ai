const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("Listing available models...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name, " - generateContent:", m.supportedGenerationMethods.includes('generateContent')));
  } catch (e) {
    console.error(e);
  }
}
run();
