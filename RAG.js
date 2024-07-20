// >  node RAG.js "what is cryovolcanism ?"

/**
 *  🚀️
 *   Chromadb installation
 *
 *  > pnpm add  chromadb
 *  > pip install chromadb
 *  > chroma run
 *
 *   if you have is kind of Error: AttributeError("type object 'CreateCollection' has no attribute 'model_validate'")
 *    upgrade pydantic by is command
 *      > pip install pydantic --upgrade
 *
 */

import colors from "colors";
import { openai } from "./openai.js";
import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// Load
const loader = new PDFLoader("titan.pdf");

const pdfFile = await loader.load();

// Document Splitting
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ".",
});

const documents = await splitter.splitDocuments(pdfFile);

// Embedding
const embeddingFunction = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
  openai_model: "text-embedding-ada-002",
});
const embeddings = await embeddingFunction.generate(
  documents.map((doc) => doc.pageContent)
);

//  vector Database.
const client = new ChromaClient();

// console.log(await client.heartbeat());

const collection = await client.getOrCreateCollection({
  name: "titan_moon",
  embeddingFunction,
});

await collection.add({
  embeddings,
  documents: documents.map((doc) => doc.pageContent),
  metadatas: documents.map((doc) => ({
    pageNumber: doc.metadata.loc.pageNumber,
    lines: JSON.stringify(doc.metadata.loc.lines),
    source: doc.metadata.source,
  })),
  ids: documents.map((_, i) => `${Date.now() + i}`),
});

const query = process.argv[2] || "hi";

// Retrieval
const results = await collection.query({
  queryTexts: [query],
  nResults: 3,
});

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  temperature: 0,
  messages: [
    {
      role: "system",
      content: "Answer my question",
    },
    {
      role: "user",
      content: `
      Context:${results.documents.map((doc) => doc).join("\n")}
      Question:${query}
      INSTRUCTIONS:
      Answer My QUESTION using the Context text above.
      Keep your answer grounded in the facts of the Context!
      If the Context doesn’t contain the facts to answer the QUESTION, return "Oh, the documents are insufficient."
      `,
    },
  ],
});

console.log(
  colors.green(colors.bold("\n", response.choices[0].message.content))
);

console.log("\n", JSON.stringify(results.metadatas));
