interface EventSource<T> {
  once(eventName: T, handler: Function): any;
}
export function once<T extends EventSource<any>>(
  eventSource: T,
  eventName: T extends EventSource<infer U> ? U : never,
) {
  return new Promise(x => eventSource.once(eventName, x));
}
