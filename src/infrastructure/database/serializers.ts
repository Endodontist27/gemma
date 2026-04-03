export const serializeStringArray = (value: string[]) => JSON.stringify(value);

export const deserializeStringArray = (value: string | null | undefined) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};
