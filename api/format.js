export const f = (strings, ...values) => values.
  reduce((acc, value, i) => {
    if (Array.isArray(value)) {
      acc.push(value.join(', '));
    } else if (typeof value === 'string') {
      acc.push(value);
    } else {
      acc.push(JSON.stringify(value));
    }
    acc.push(strings[i + 1]);
    return acc;
  }, [strings[0]]).
  join('');
