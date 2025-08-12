import webWorkerHandler from "../../src/languageModel/webWorkerHandler.ts";
console.log("HELLO FROM APP WORKER");
self.onmessage = (message) => {
  webWorkerHandler().onmessage(message);
};
