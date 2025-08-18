import webWorkerHandler from "../../src/languageModel/webWorkerHandler.ts";
self.onmessage = (message) => {
  webWorkerHandler().onmessage(message);
};
