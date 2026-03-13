export const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};
