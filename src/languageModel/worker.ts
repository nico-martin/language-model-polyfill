import {
  ErrorResponse,
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";
import getLanguageModelAvailability from "./worker/utils/getLanguageModelAvailability";
import CausalLMPipeline from "./worker/utils/CausalLMPipeline";
import KVCache from "./worker/utils/KVCache";
import prompt from "./worker/utils/prompt";
import { WorkerError, WorkerErrorCode } from "./worker/utils/WorkerError";

const cache = new KVCache();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case RequestType.CHECK_AVAILABILITY: {
        postMessage({
          id: request.id,
          type: ResponseType.AVAILABILITY,
          availability: await getLanguageModelAvailability(request.model_id),
        });
        return;
      }
      case RequestType.LOAD_MODEL: {
        await CausalLMPipeline.getInstance(request.model_id, (progressInfo) => {
          postMessage({
            id: request.id,
            type: ResponseType.LOAD_MODEL_PROGRESS,
            progress: progressInfo,
          });
        });
        postMessage({
          id: request.id,
          type: ResponseType.MODEL_LOADED,
        });
        return;
      }
      case RequestType.PROMPT: {
        const [tokenizer, model] = await CausalLMPipeline.getInstance(
          request.model_id,
          (progressInfo) => {
            postMessage({
              id: request.id,
              type: ResponseType.LOAD_MODEL_PROGRESS,
              progress: progressInfo,
            });
          },
        );

        const resp = await prompt({
          tokenizer,
          model,
          messages: request.messages,
          cache,
          on_response_update: (token_generated: string) => {
            postMessage({
              id: request.id,
              type: ResponseType.PROMPT_PROGRESS,
              token_generated,
            });
          },
          temperature: request.temperature,
          top_k: request.top_k,
          is_init_cache: request.is_init_cache,
          model_id: request.model_id,
        });
        postMessage({
          id: request.id,
          type: ResponseType.PROMPT_DONE,
          response: resp.answer,
          messages: resp.newMessages,
          usage: resp.usage,
        });
        return;
      }
      default:
        const noHandlerError = new WorkerError(
          WorkerErrorCode.NO_HANDLER,
          // @ts-expect-error
          `No handler found for request type: ${request.type}`,
        );
        // @ts-expect-error
        postMessage(noHandlerError.toErrorResponse(request.id));
    }
  } catch (error) {
    const workerError = WorkerError.fromError(
      error,
      WorkerErrorCode.HANDLER_ERROR,
    );
    self.postMessage(workerError.toErrorResponse(request.id));
  }
};

const postMessage = (message: WorkerResponse) => self.postMessage(message);
