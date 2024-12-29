export const convertNumberToIndex = (number) => {
  const normalizedNumber = Number.isInteger(number) ? number : 1;
  return normalizedNumber - 1;
};

export const parseLineNumber = (lineNumber) => {
  const parsedValue = Number.parseInt(lineNumber, 10);
  return isNaN(parsedValue) ? 1 : parsedValue;
};
