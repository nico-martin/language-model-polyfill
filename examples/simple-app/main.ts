import { LanguageModelPolyfill } from "../../src";

const output = document.getElementById("output") as HTMLParagraphElement;
const buttonAbort = document.getElementById("btnAbort") as HTMLButtonElement;
const buttonLoad = document.getElementById("btnLoad") as HTMLButtonElement;
const buttonGenerate = document.getElementById(
  "btnGenerate",
) as HTMLButtonElement;

let abortController = new AbortController();

buttonAbort.addEventListener("click", () => {
  abortController.abort();
  abortController = new AbortController();
});

(globalThis as any).LanguageModel = LanguageModelPolyfill;

let session: LanguageModel | null = null;
buttonLoad.addEventListener("click", async () => {
  const availability = await LanguageModel.availability();
  console.log(availability);
  if (availability === "unavailable") {
    alert("Model not available");
    return;
  }
  buttonLoad.value = `loading (0%)`;

  session = await LanguageModel.create({
    signal: abortController.signal,
    initialPrompts: [
      {
        role: "system",
        content: "You are a mediator in a discussion between two departments.",
      },
    ],
    monitor: function (m) {
      m.addEventListener("downloadprogress", (e) => {
        buttonLoad.textContent = `loading (${Math.round(e.loaded * 100 * 100) / 100}%)`;
      });
    },
  });
  buttonLoad.textContent = `loaded`;
  buttonLoad.disabled = true;
  buttonGenerate.disabled = false;
});

buttonGenerate.disabled = true;

buttonGenerate.addEventListener("click", async () => {
  console.log("Button clicked");
  if (!session) throw new Error("No session found!");

  session.addEventListener("quotaoverflow", () => {
    console.log("We've gone past the quota, and some inputs will be dropped!");
  });

  const stream = session.promptStreaming(
    "Tell me a short poem in which you are the hero",
    {
      signal: abortController.signal,
    },
  );
  const reader = stream.getReader();

  let reply = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    reply += value;
    output.textContent = reply;
  }
  console.log(`${session.inputUsage}/${session.inputQuota}`);

  const answer = await session.prompt("Who is the hero in this poem", {
    signal: abortController.signal,
  });

  const contextWindowTests = [
    "What is the capital of France?",
    "In my previous question, which country did I ask about?",
    "List all the countries I've mentioned so far in chronological order.",
    "What was the first question I asked you in this conversation?",
    "How many questions have I asked you total, including this one?",
    "Summarize all the topics we've discussed so far in one sentence.",
    "What was the third question I asked?",
    "Create a numbered list of every question I've asked, word for word.",
    "Which question number is this one?",
    "What patterns do you notice in my questioning style across all questions?",
    "Repeat the exact wording of questions 2, 5, and 7.",
    "How many times have I asked you to reference previous questions?",
    "What was the longest question I've asked so far?",
    "List all the numbers that have appeared in any of my questions.",
    "What percentage of my questions asked you to recall previous information?",
    "Create a timeline showing the evolution of topics from question 1 to now.",
    "Which question was most similar to this current one?",
    "Identify any questions that built upon answers from previous questions.",
    "What was different between question 4 and question 8?",
    "Provide a complete transcript of our conversation from the very beginning.",
  ];

  for (const question of contextWindowTests) {
    console.log(
      await session.prompt(question, { signal: abortController.signal }),
    );
    console.log(`${session.inputUsage}/${session.inputQuota}`);
  }

  console.log(answer);
});
