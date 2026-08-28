type ArchiveWriteQueue = <T>(task: () => Promise<T>) => Promise<T>;

export function createArchiveWriteQueue(): ArchiveWriteQueue {
  let tail = Promise.resolve();
  return <T>(task: () => Promise<T>) => {
    const result = tail.then(task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

export const enqueueArchiveOperation = createArchiveWriteQueue();
