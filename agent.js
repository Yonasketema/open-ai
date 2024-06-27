import { openai } from "./openai.js";
import { evaluate } from "mathjs";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import colors from "colors";

function mathCalculator(expression) {
  return `the result ${evaluate(expression)}`;
}

async function WebSearch(url) {
  const loader = new PuppeteerWebBaseLoader(url);

  const docs = await loader.load()[0].pageContent;

  return docs;
}

async function Wikipedia(q) {
  const loader = new PuppeteerWebBaseLoader(
    `https://en.wikipedia.org/wiki/${q}`
  );

  const docs = (await loader.load())[0].pageContent;

  return docs;
}

const available_functions = {
  mathCalculator: {
    function: mathCalculator,
    args: ["expression"],
  },
  WebSearch: {
    function: WebSearch,
    args: ["url"],
  },
  Wikipedia: {
    function: Wikipedia,
    args: ["search_query"],
  },
};

const QUESTION = process.argv[2] || "hi";

const messages = [
  {
    role: "system",
    content: `
    You run in a loop of Thought, Task , Action , Action Output.
    At the end of the loop you output an Answer to the original input question.
    Use Thought to describe your thoughts about the question you have been asked.
    use Task to describe what you need to do to answer the question in this step.
    Use Action to run one of the tool available to you .
    use Action Output will be the result of running those actions.
    After the Action is run you  will be called again with Action Output.

    Your available tool are:

    WebSearch: A search engine. Useful for when you have a url to answer questions. Input should be a URL.
    mathCalculator: Useful for when you need to answer questions about math.
    Wikipedia: Useful for when you need to answer general questions about people, places, companies, facts, historical events, or other subjects. Input should be a search query.
 

    Example 1:

    Question:  who is the last king of ethiopia?
    Thought: To find the last king of Ethiopia, I should search on Wikipedia.
    Task: Search on wikipedia. 
    Action: Wikipedia [last king of Ethiopia].
    Action Output: The last king of Ethiopia is Haile Selassie I.
    Thought: I now know the Answer.

    Answer: The last king of Ethiopia is Haile Selassie I.

    You are first required to search on a given URL (if provided) and only if the URL doesn’t yield an answer, proceed to search on Wikipedia.

    Example 2:

    Question: who is the marathon runner who won the gold barefoot http://nasa.com ?
    Thought:To find the athlete, I need to search on http://nasa.com.
    Task: Search on http://nasa.com. 
    Action: WebSearch [http://nasa.com].  
    Action Output: Mars is the neighboring planet to Earth.
    Thought: Because I didn’t get any info to answer the question from the given URL, I need to search on Wikipedia.
    Task: Search on wikipedia. 
    Action:  Wikipedia [won marathon barefoot].
    Action Output: The Ethiopian athlete Abebe Bikila won a marathon barefoot in 1960 at the Rome Olympics.
    Thought: I now know the  Answer.

    Answer: The marathon athlete who won barefoot is Abebe Bikila.
    
    `,
  },
  {
    role: "user",
    content: `QUESTION: ${QUESTION} 
              Thought:
                         
  `,
  },
];

const getCompletion = async (messages) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
        {
          type: "function",
          function: {
            name: "WebSearch",
            description: "search on a given URL",
            parameters: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "the url used to search on web ",
                },
              },
              required: ["url"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "Wikipedia",
            description: "search on a given URL",
            parameters: {
              type: "object",
              properties: {
                search_query: {
                  type: "string",
                  description: "the search_query used to search on Wikipedia",
                },
              },
              required: ["search_query"],
            },
          },
        },
      ],
    });
    return response;
  } catch (error) {
    console.log(error);
    console.log(colors.cyan(messages));
  }
};

let response;

console.log(colors.blue(colors.bold(`QUESTION: ${QUESTION} `)));
while (true) {
  response = await getCompletion(messages);
  const response_message = response.choices[0].message;

  console.log(`${colors.green(colors.bold(response_message.content))}`);

  if (response.choices[0].finish_reason === "stop") {
    console.log(`${colors.green(colors.bold(response_message.content))}`);

    break;
  }

  const tool_calls = response_message.tool_calls;

  messages.push(response_message);

  if (tool_calls) {
    await Promise.all(
      tool_calls.map(async (tool_call) => {
        const function_name = tool_call.function.name;
        const function_args = JSON.parse(tool_call.function.arguments);
        const function_to_call = available_functions[function_name].function;
        const function_to_call_args =
          available_functions[function_name].args[0];

        console.log(
          `${colors.green(
            colors.bold(`Action Input: ${JSON.stringify(function_args)}`)
          )}`
        );

        const function_response = await function_to_call(
          function_args[function_to_call_args]
        );

        console.log(
          `${colors.green(colors.bold(`Action Output: ${function_response}`))}`
        );

        messages.push({
          tool_call_id: tool_call.id,
          role: "tool",
          name: function_name,
          content: `Action Output: ${function_response}`,
        });
      })
    );
  }
}
