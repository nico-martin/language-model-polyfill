/// <reference types="@webgpu/types" />
import isFileInCache from "./isFileInCache";
import { MODEL } from "../../../constants";

const getLanguageModelAvailability = async (): Promise<Availability> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    return "unavailable";
  }

  const filesInCache = await Promise.all(
    Object.keys(MODEL.expectedFiles).map((file) =>
      isFileInCache(
        "transformers-cache",
        `https://huggingface.co/${MODEL.id}/resolve/main/${file}`,
      ),
    ),
  );

  if (filesInCache.every((c) => c)) {
    return "available";
  }

  return "downloadable";
};

export default getLanguageModelAvailability;
