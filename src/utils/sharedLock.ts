export class SharedLock {
  private chain = Promise.resolve();

  public wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
  ): (...args: [...Parameters<T>, skipLock?: boolean]) => ReturnType<T> {
    return (...args) => {
      let skipLock = false;
      let params: Parameters<T>;

      if (args.length !== fn.length) skipLock = args.pop() ?? false;
      params = args as any;
      if (skipLock) return fn(...params) as ReturnType<T>;
      return this.run(fn, ...params);
    };
  }

  public run<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    ...args: Parameters<T>
  ): ReturnType<T> {
    return (this.chain = this.chain.finally(() =>
      fn(...args),
    )) as ReturnType<T>;
  }
}
