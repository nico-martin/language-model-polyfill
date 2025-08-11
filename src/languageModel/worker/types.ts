import { ProgressInfo } from "@huggingface/transformers";

interface BaseRequest {
  id: string;
  type: RequestType;
}

interface BaseResponse {
  id: string;
  type: ResponseType;
}

export enum RequestType {
  CHECK_AVAILABILITY,
  LOAD_MODEL,
  PROMPT,
}

export enum ResponseType {
  ERROR,
  AVAILABILITY,
  LOAD_MODEL_PROGRESS,
  MODEL_LOADED,
  PROMPT_DONE,
  PROMPT_PROGRESS,
}

/**
 * Request Types
 */

interface CheckAvailabilityRequest extends BaseRequest {
  type: RequestType.CHECK_AVAILABILITY;
}

interface LoadModelRequest extends BaseRequest {
  type: RequestType.LOAD_MODEL;
}

interface PromptRequest extends BaseRequest {
  type: RequestType.PROMPT;
  prompt: string;
}

/**
 * Response Types
 */

interface AvailabilityResponse extends BaseResponse {
  type: ResponseType.AVAILABILITY;
  availability: Availability;
}

interface ModelLoadingProgressResponse extends BaseResponse {
  type: ResponseType.LOAD_MODEL_PROGRESS;
  progress: ProgressInfo;
}

interface ModelLoadedResponse extends BaseResponse {
  type: ResponseType.MODEL_LOADED;
}

interface PromptProgressResponse extends BaseResponse {
  type: ResponseType.PROMPT_PROGRESS;
  partial_response: string;
}

interface PromptDoneResponse extends BaseResponse {
  type: ResponseType.PROMPT_DONE;
  response: string;
}

export interface ErrorResponse extends BaseResponse {
  type: ResponseType.ERROR;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type WorkerRequest =
  | CheckAvailabilityRequest
  | LoadModelRequest
  | PromptRequest;

export type WorkerResponse =
  | AvailabilityResponse
  | ErrorResponse
  | ModelLoadedResponse
  | ModelLoadingProgressResponse
  | PromptProgressResponse
  | PromptDoneResponse;
