import colors from "colors";
import readline from "readline";
import { openai } from "./openai.js";

const rl = readline.createInterface({
  output: process.stdout,
  input: process.stdin,
});

const newMessage = async (history, message) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [...history, message],
    temperature: 0,
  });

  // console.log(response);
  return response.choices.at(0).message;
};

const formatMessage = (userInput) => ({ role: "user", content: userInput });

const chat = () => {
  const history = [
    { role: "system", content: "You are my Ai assistant. Answer my Questions" },
  ];

  const start = () => {
    rl.question(colors.bold("> You: "), async (userInput) => {
      if (userInput.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      const userMessage = formatMessage(userInput);
      const response = await newMessage(history, userMessage);

      history.push(userMessage, response);
      console.log(
        `${colors.green(colors.bold(`\nAI: ${response.content}\n`))}`
      );
      start();
    });
  };

  start();
};

console.log(
  `${colors.blue(colors.bold("ChatBot . Type 'exit' to end the chat. \n"))}`
);
chat();
