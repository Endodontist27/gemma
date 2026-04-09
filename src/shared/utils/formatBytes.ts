export const formatBytesToGiB = (bytes: number | null | undefined) => {
  if (!bytes || bytes <= 0) {
    return null;
  }

  return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
};
