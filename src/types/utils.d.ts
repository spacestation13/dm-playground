export type RecursiveOmit<T, K extends keyof T> = T extends any
  ? Omit<T, K>
  : never;
