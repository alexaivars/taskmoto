export const breakpoints = {
  mobile: 384, // 2 column layout
  /*
    The phablet is a class of modern mobile devices combining or straddling the
    size format of smartphones and tablets and is used for the edge cases where
    tablet or mobile visualy feel off.
  */
  phablet: 560,
  tablet: 720, // 3 column layout
  desktop: 880, // 4 column layout
} as const;

type BreakpointKey = keyof typeof breakpoints;

export function lessThan(key: BreakpointKey) {
  return `@media (max-width: ${breakpoints[key] - 1}px)`;
}

export function greaterThan(key: BreakpointKey) {
  return `@media (min-width: ${breakpoints[key]}px)`;
}

export function between(firstKey: BreakpointKey, secondKey: BreakpointKey) {
  return `@media (min-width: ${breakpoints[firstKey]}px) and (max-width: ${
    breakpoints[secondKey] - 1
  }px)`;
}

export const media = {
  lessThan,
  greaterThan,
  between,
};

export default media;

