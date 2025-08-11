import {
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";
import { MODEL } from "../constants";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const postMessage = (message: WorkerRequest) => worker.postMessage(message);

let workerRequestId = 0;

class TransformersJsModel {
  public async loadModel(
    monitor?: CreateMonitor,
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) {
      throw new DOMException("Operation aborted", "AbortError");
    }

    const updateProgress = (progress: {
      progress: number;
      loaded: number;
      total: number;
    }) => {
      if (monitor) {
        const event = new ProgressEvent("downloadprogress", {
          lengthComputable: true,
          loaded: progress.progress,
          total: progress.total,
        });

        if (monitor.ondownloadprogress) {
          monitor.ondownloadprogress.call(monitor, event);
        }
        monitor.dispatchEvent(event);
      }
    };

    return new Promise<void>((resolve, reject) => {
      const requestId = (workerRequestId++).toString();

      const filesMap: Record<
        string,
        {
          loaded: number;
          total: number;
        }
      > = Object.entries(MODEL.expectedFiles).reduce(
        (acc, [file, total]) => ({
          ...acc,
          [file]: {
            loaded: 0,
            total,
          },
        }),
        {},
      );

      let refProgressPercentages = 0;

      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;

        if (e.data.type === ResponseType.ERROR) {
          worker.removeEventListener("message", listener);
          reject(e.data.error);
        }

        if (e.data.type === ResponseType.MODEL_LOADED) {
          worker.removeEventListener("message", listener);
          resolve();
        }

        if (
          e.data.type === ResponseType.LOAD_MODEL_PROGRESS &&
          e.data.progress.status === "progress"
        ) {
          const progress = e.data.progress;
          filesMap[progress.file] = {
            loaded: progress.loaded,
            total: progress.total,
          };
          const { total, loaded } = Object.entries(filesMap).reduce(
            (acc, [, progress]) => ({
              total: acc.total + progress.total,
              loaded: acc.loaded + progress.loaded,
            }),
            { total: 0, loaded: 0 },
          );
          const newProgressPercentages =
            Math.round((loaded / total) * 10000) / 10000;
          const newProgress = {
            progress: newProgressPercentages,
            loaded,
            total,
          };
          if (
            JSON.stringify(refProgressPercentages) !==
            JSON.stringify(newProgressPercentages)
          ) {
            updateProgress(newProgress);
            refProgressPercentages = newProgressPercentages;
          }
        }
      };

      worker.addEventListener("message", listener);

      postMessage({
        id: requestId,
        type: RequestType.LOAD_MODEL,
      });
    });
  }

  async prompt(
    input: Array<LanguageModelMessage | LanguageModelSystemMessage>,
    options?: LanguageModelPromptOptions,
  ): Promise<string> {
    console.log("PROMPT", input);
    return new Promise((resolve, reject) => {
      resolve("test");
      /*const requestId = (workerRequestId++).toString();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;
        worker.removeEventListener("message", listener);

        if (e.data.type === ResponseType.ERROR) {
          reject(e.data.error);
        }

        if (e.data.type === ResponseType.PROMPT_RESPONSE) {
          resolve(e.data.response);
        }
      };

      worker.addEventListener("message", listener);

      postMessage({
        id: requestId,
        type: RequestType.PROMPT,
        input,
        options,
      });*/
    });
  }

  static async availability(): Promise<Availability> {
    return new Promise((resolve, reject) => {
      const requestId = (workerRequestId++).toString();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;
        worker.removeEventListener("message", listener);

        if (e.data.type === ResponseType.ERROR) {
          reject(e.data.error);
        }

        if (e.data.type === ResponseType.AVAILABILITY) {
          resolve(e.data.availability);
        } else {
          resolve("unavailable");
        }
      };

      worker.addEventListener("message", listener);

      postMessage({
        id: requestId,
        type: RequestType.CHECK_AVAILABILITY,
      });
    });
  }
}

export default TransformersJsModel;
