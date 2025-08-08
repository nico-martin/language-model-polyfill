/// <reference types="@webgpu/types" />
const getLanguageModelAvailability = async (): Promise<Availability> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    return "unavailable";
  }
  return "downloadable";
};

export default getLanguageModelAvailability;
