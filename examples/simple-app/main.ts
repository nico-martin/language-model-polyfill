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
  console.log(answer);
});
