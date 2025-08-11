import { LanguageModel } from "../../src";

const button = document.getElementById("btn") as HTMLButtonElement;

if (button) {
  button.addEventListener("click", async () => {
    console.log("Button clicked");
    const availability = await LanguageModel.availability();
    console.log(availability);
    if (availability === "unavailable") {
      alert("Model not available");
      return;
    }

    const params = await LanguageModel.params();

    const model = await LanguageModel.create({
      temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
      topK: params.defaultTopK,
      initialPrompts: [
        {
          role: "system",
          content: "You are a helpful and friendly assistant.",
        },
        { role: "user", content: "What is the capital of Italy?" },
        { role: "assistant", content: "The capital of Italy is Rome." },
        { role: "user", content: "What language is spoken there?" },
        {
          role: "assistant",
          content: "The official language of Italy is Italian. [...]",
        },
      ],
    });
    console.log("model");
    console.log(model);
    const response = await model.prompt("Who are you?");
    const responseOne2 = await model.prompt("Nice to meet you");
    console.log("response");
    console.log(response);
    console.log(responseOne2);

    const modelTwo = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content: "You are a helpful and friendly assistant.",
        },
      ],
    });
    console.log("modelTwo");
    console.log(modelTwo);
    const responseTwo = await modelTwo.prompt("Who are you?");
    console.log("responseTwo");
    console.log(responseTwo);
  });
}
