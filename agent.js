import { openai } from "./openai.js";
import { evaluate } from "mathjs";

function mathCalculator(expression) {
  return `the result ${evaluate(expression)}`;
}

// if a given data is out of context window

// scraper ->  vector - rag - send question data

//wiki - vector - Rag- answer

function WebSearch(url) {
  return "win a bet";
}

function Wikipedia(q) {
  const searchTerm = q;

  // const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
  //   searchTerm
  // )}`;

  // fetch(url)
  //   .then((response) => response.json())
  //   .then((data) => {
  //     const results = data.query.search;
  //     results.forEach((result) => {
  //       const title = result.title;
  //       const snippet = result.snippet;

  //       console.log(`Title: ${title}`);
  //       console.log(`Snippet: ${snippet}`);
  //       console.log("---");
  //     });
  //   })
  //   .catch((error) => {
  //     console.error("Error:", error);
  //   });

  return "adwa took place in ethiopia at 1888";
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
    You run in a loop of Thought, Task , Action , Action Output
    At the end of the loop you output an Answer
    Use Thought to describe your thoughts about the question you have been asked.
    use Task to describe what do you do to answer the question in the step 
    Use Action to run one of the tool available to you .
    use Action Output will be the result of running those actions.

      
    Your available tool are:

    mathCalculator:
    e.g. calculate  4 * 7 / 3
    Runs a calculation and returns the number 

    WebSearch:
    e.g search https://yonask.com
    search and return a summary from searching a given URL

    Wikipedia:
    e.g. search to find information about adwa
    Search on a given search query and return the answer from Wikipedia


    Example 1:

    Question: who is the last king of ethiopia?
    Thought: to find the last king of ethiopia i should search on wikipedia
    Task: Search on wikipedia  
    Action: wikipedia [ethiopia]

    You will be called again with this:

    Action Output: the last king of ethiopia is hhhh
    Thought: I now know the final answer

    Answer: the last king of ethiopia is hhhh

    Always search on a given URL first and give the answer . but if you don't get an answer search 
    Wikipedia 

    Example 2:

    Question: who is the marathon runner  won the gold  with bear foot ? http://nasa.com
    Thought: to find the athlete i need to search  on http://nasa.com.
    Task: Search on http://nasa.com  
    Action: WebSearch [http://nasa.com]  

    You will be called again with this:

    Action Output: mar is the neighbor planet for earth
    Thought: because of i don't get any info to answer the question from a given url . I need to search on wikipedia.
    Task: Search on wikipedia 
    Action: wikipedia [won marathon with bear foot] 

    You will be called again with this:

    Action Output: the Ethiopian athlete abebe bekila won a marathon  with his bear foot in 1968 at rome olympic
    Thought: I now know the final answer
  
    Answer:  the marathon athlete who won with his bear foot is abebe bekila
    
    `,
  },
  {
    role: "user",
    content: `QUESTION: ${QUESTION} 
              Thought:{agent_scratchpad}
                         
  `,
  },
];

const getCompletion = async (messages) => {
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
};

let response;

// New
console.log(`QUESTION: ${QUESTION} `);
while (true) {
  response = await getCompletion(messages);
  const response_message = response.choices[0].message;

  console.log(response_message.content);

  messages.push(response_message);

  if (response.choices[0].finish_reason === "stop") {
    console.log(response_message.content);
    // console.log(messages);
    break;
  }

  const tool_calls = response_message.tool_calls;

  if (tool_calls) {
    tool_calls.forEach((tool_call) => {
      const function_name = tool_call.function.name;
      const function_args = JSON.parse(tool_call.function.arguments);
      const function_to_call = available_functions[function_name].function;
      const function_to_call_args = available_functions[function_name].args[0];

      console.log(`Action Input: ${JSON.stringify(function_args)} `);

      const function_response = function_to_call(
        function_args[function_to_call_args]
      );

      console.log(`Action Output: ${function_response} `);

      messages.push({
        tool_call_id: tool_call.id,
        role: "tool",
        name: function_name,
        content: `Action Output: ${function_response}`,
      });
    });
  }
}
