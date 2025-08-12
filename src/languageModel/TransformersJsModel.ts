import {
  ModelUsage,
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";
import { ModelIds, MODELS } from "../constants";
import { Message } from "@huggingface/transformers";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const postMessage = (message: WorkerRequest) => worker.postMessage(message);

let workerRequestId = 0;

class TransformersJsModel {
  private model_id: ModelIds;

  public constructor(model_id: ModelIds = "Qwen3-4B") {
    this.model_id = model_id;
  }

  public get maxToken() {
    return MODELS[this.model_id].maxToken;
  }

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
      > = Object.entries(MODELS[this.model_id].expectedFiles).reduce(
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
        model_id: this.model_id,
      });
    });
  }

  async prompt(
    input: Array<LanguageModelMessage | LanguageModelSystemMessage>,
    temperature: number,
    top_k: number,
    is_init_cache: boolean,
    onResponseUpdate: (response: string) => void = () => {},
    options?: LanguageModelPromptOptions,
  ): Promise<{
    response: string;
    messages: Array<Message>;
    usage: ModelUsage;
  }> {
    return new Promise((resolve, reject) => {
      const requestId = (workerRequestId++).toString();
      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== requestId) return;

        if (e.data.type === ResponseType.ERROR) {
          worker.removeEventListener("message", listener);
          reject(e.data.error);
        }

        if (e.data.type === ResponseType.PROMPT_PROGRESS) {
          onResponseUpdate(e.data.token_generated);
        }

        if (e.data.type === ResponseType.PROMPT_DONE) {
          worker.removeEventListener("message", listener);
          resolve({
            response: e.data.response,
            messages: e.data.messages,
            usage: e.data.usage,
          });
        }
      };

      worker.addEventListener("message", listener);

      postMessage({
        id: requestId,
        type: RequestType.PROMPT,
        messages: input.map((message) => ({
          role: message.role,
          content: message.content.toString(),
        })),
        temperature,
        top_k,
        is_init_cache,
        model_id: this.model_id,
      });
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
        model_id: "Qwen3-4B",
      });
    });
  }
}

export default TransformersJsModel;
