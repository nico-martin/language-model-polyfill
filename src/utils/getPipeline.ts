const getPipeline = async () => {
  if (__IS_WORKER__) {
    return await import(
      // @ts-ignore
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1/+esm"
    );
  } else {
    return await import("@huggingface/transformers");
  }
};

export default getPipeline;
