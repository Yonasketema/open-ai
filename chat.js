import { openai } from "./openai.js";
import readline from "readline";

const rl = readline.createInterface({
  output: process.stdout,
  input: process.stdin,
});

const newMessage = async (history, message) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    message: [...history, message],
    temperature: 0,
  });

  return response.choices[0].message;
};

const formatMessage = (userInput) => ({ role: "user", content: userInput });

const chat = () => {
  const history = [
    { role: "system", content: "You are my Ai assistant. Answer my Questions" },
  ];

  const start = () => {
    rl.question("> You: ", async (userInput) => {
      if (userInput.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      const userMessage = formatMessage(userInput);
      const response = await newMessage(history, userMessage);

      history.push(userMessage, response);
      console.log(`\n\nAI: ${response.content}\n\n`);
      start();
    });
  };

  start();
};

console.log("ChatBot . Type 'exit' to end the chat.");
chat();
