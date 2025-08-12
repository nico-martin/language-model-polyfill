import { LanguageModel as TFLanguageModel } from "../../src";

const output = document.getElementById("output") as HTMLParagraphElement;
const buttonAbort = document.getElementById("btnAbort") as HTMLButtonElement;
const button = document.getElementById("btn") as HTMLButtonElement;

let abortController = new AbortController();

//TFLanguageModel.model_id = "Qwen3-4B";
buttonAbort.addEventListener("click", () => {
  abortController.abort();
  abortController = new AbortController();
});

if (button) {
  button.disabled = true;

  const init = async () => {
    const availability = await TFLanguageModel.availability();
    console.log(availability);
    if (availability === "unavailable") {
      alert("Model not available");
      return;
    }

    const session = await TFLanguageModel.create({
      signal: abortController.signal,
      temperature: 2,
      initialPrompts: [
        {
          role: "system",
          content: "You are Alfred, a helpful and friendly assistant.",
        },
      ],
    });

    button.disabled = false;
    button.addEventListener("click", async () => {
      console.log("Button clicked");

      session.addEventListener("quotaoverflow", () => {
        console.log(
          "We've gone past the quota, and some inputs will be dropped!",
        );
      });

      const stream = session.promptStreaming("Write me an short poem!", {
        signal: abortController.signal,
      });
      const reader = stream.getReader();

      let reply = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += value;
        output.textContent = reply;
      }
      console.log(`${session.inputUsage}/${session.inputQuota}`);
      console.log("usage", session.latestUsage);

      const answer = await session.prompt("Who is the hero in this poem", {
        signal: abortController.signal,
      });
      console.log(answer);
      console.log("usage", session.latestUsage);
      console.log(`${session.inputUsage}/${session.inputQuota}`);
    });
  };
  init();
}
