declare module 'node:test' {
  type TestFn = (name: string, fn: () => void | Promise<void>) => Promise<void>;
  const test: TestFn;
  export const describe: TestFn;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export { test };
  export default test;
}

declare module 'node:assert/strict' {
  const assert: {
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: T, expected: T, message?: string): void;
    notEqual<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    rejects(
      block: Promise<unknown> | (() => Promise<unknown>),
      error?: (err: any) => boolean,
      message?: string
    ): Promise<void>;
  };
  export default assert;
}
