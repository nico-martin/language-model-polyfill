import { LanguageModel } from "../../src";

const button = document.getElementById("btn") as HTMLButtonElement;

if (button) {
  button.addEventListener("click", async () => {
    const availability = await LanguageModel.availability();
    console.log(availability);
    if (availability === "unavailable") {
      alert("Model not available");
      return;
    }
  });
}
