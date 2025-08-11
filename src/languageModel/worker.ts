import {
  ErrorResponse,
  RequestType,
  ResponseType,
  WorkerRequest,
  WorkerResponse,
} from "./worker/types";
import getLanguageModelAvailability from "./worker/utils/getLanguageModelAvailability";
import CausalLMPipeline from "./worker/utils/CausalLMPipeline";

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case RequestType.CHECK_AVAILABILITY: {
        postMessage({
          id: request.id,
          type: ResponseType.AVAILABILITY,
          availability: await getLanguageModelAvailability(),
        });
        return;
      }
      case RequestType.LOAD_MODEL: {
        await CausalLMPipeline.getInstance((progressInfo) => {
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
      default:
        postMessage({
          id: request.id,
          type: ResponseType.ERROR,
          error: {
            message: `No handler found for request type: ${request.type}`,
            code: "NO_HANDLER",
          },
        });
    }
  } catch (error) {
    const errorResponse: ErrorResponse = {
      id: request.id,
      type: ResponseType.ERROR,
      error: {
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        code: "HANDLER_ERROR",
        details: error,
      },
    };
    self.postMessage(errorResponse);
  }
};

const postMessage = (message: WorkerResponse) => self.postMessage(message);
