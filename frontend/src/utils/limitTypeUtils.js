/**
 * Normalize various limit type representations so that components can rely on a consistent
 * canonical value. The function trims whitespace, uppercases English words, and maps
 * localized variants such as "实报实销" to the canonical "ACTUAL".
 */
export const normalizeLimitType = (limitType) => {
  if (limitType === null || limitType === undefined) {
    return '';
  }

  if (typeof limitType === 'string') {
    const trimmed = limitType.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed === '实报实销') {
      return 'ACTUAL';
    }
    return trimmed.toUpperCase();
  }

  return limitType;
};

/**
 * Checks whether the provided limit type corresponds to the "ACTUAL" (实报实销) category.
 */
export const isActualLimitType = (limitType) => {
  return normalizeLimitType(limitType) === 'ACTUAL';
};











