/**
 * > node tool_function.js "evaluate sin(45 deg) ^ 2"
 */

import { openai } from "./openai.js";
import { evaluate } from "mathjs";

function mathCalculator(expression) {
  return `the result ${evaluate(expression)}`;
}

const QUESTION = process.argv[2] || "hi";

const messages = [{ role: "user", content: QUESTION }];

const available_functions = {
  mathCalculator,
};

const getCompletion = async (messages) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0613",
    temperature: 0,
    messages,
    tool_choice: "auto",
    tools: [
      {
        type: "function",
        function: {
          name: "mathCalculator",
          description: "Run a math expression",
          parameters: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description:
                  "Then math expression to evaluate like '2 * 3 + (21 / 2) ^ 2'",
              },
            },
            required: ["expression"],
          },
        },
      },
    ],
  });
  return response;
};

let response;

// New

while (true) {
  response = await getCompletion(messages);

  if (response.choices[0].finish_reason === "stop") {
    console.log(response.choices[0].message.content);
    break;
  }

  const response_message = response.choices[0].message;

  const tool_calls = response_message.tool_calls;

  if (tool_calls) {
    messages.push(response_message);
    tool_calls.forEach((tool_call) => {
      const function_name = tool_call.function.name;
      const function_args = JSON.parse(tool_call.function.arguments);
      const function_to_call = available_functions[function_name];

      const function_response = function_to_call(function_args.expression);

      messages.push({
        tool_call_id: tool_call.id,
        role: "tool",
        name: function_name,
        content: function_response,
      });
    });
  }
}
