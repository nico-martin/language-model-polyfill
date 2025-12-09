import { type ProgressInfo } from "@huggingface/transformers";

export default function calculateDownloadProgress(
  callback: (data: {
    percentage: number;
    total: number;
    loaded: number;
    files: Record<string, number>;
  }) => void,
  files: Map<string, { loaded: number; total: number }> = new Map(),
) {
  return (progressInfo: ProgressInfo) => {
    if (progressInfo.status === "ready") {
      let totalLoaded = 0;
      let totalSize = 0;
      const filesRecord: Record<string, number> = {};

      for (const [fileName, fileProgress] of files.entries()) {
        totalLoaded += fileProgress.loaded;
        totalSize += fileProgress.total;
        filesRecord[fileName] = fileProgress.total;
      }

      callback({
        percentage: 100,
        total: totalSize,
        loaded: totalLoaded,
        files: filesRecord,
      });
      return;
    }
    if (progressInfo.status === "progress") {
      files.set(progressInfo.file, {
        loaded: progressInfo.loaded,
        total: progressInfo.total,
      });

      const hasOnnxFile = Array.from(files.keys()).some((file) =>
        file.endsWith(".onnx"),
      );

      if (!hasOnnxFile) {
        callback({
          percentage: 0,
          total: 0,
          loaded: 0,
          files: {},
        });
        return;
      }

      let totalLoaded = 0;
      let totalSize = 0;
      const filesRecord: Record<string, number> = {};

      for (const [fileName, fileProgress] of files.entries()) {
        totalLoaded += fileProgress.loaded;
        totalSize += fileProgress.total;
        filesRecord[fileName] = fileProgress.total;
      }

      const percentage = totalSize > 0 ? totalLoaded / totalSize : 0;

      /*if (percentage === 100) {
        console.log("totalSize");
        console.log(totalSize);
        console.log("filesRecord");
        console.log(filesRecord);
      }*/

      callback({
        percentage,
        total: totalSize,
        loaded: totalLoaded,
        files: filesRecord,
      });
    }
  };
}
