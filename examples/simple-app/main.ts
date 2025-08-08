import { LanguageModel } from "../../src";

const button = document.getElementById("btn") as HTMLButtonElement;

if (button) {
  button.addEventListener("click", async () => {
    const availablilty = await LanguageModel.availability();
    console.log(availablilty);
    if (availablilty === "unavailable") {
      alert("Model not available");
      return;
    }
  });
}
