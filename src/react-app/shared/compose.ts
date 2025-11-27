/**
 * Composes functions right-to-left
 */
export function compose<T>(fn1: (a: T) => T): (a: T) => T;
export function compose<T, A>(fn2: (a: A) => T, fn1: (a: T) => A): (a: T) => T;
export function compose<T, A, B>(
  fn3: (a: B) => T,
  fn2: (a: A) => B,
  fn1: (a: T) => A
): (a: T) => T;
export function compose<T, A, B, C>(
  fn4: (a: C) => T,
  fn3: (a: B) => C,
  fn2: (a: A) => B,
  fn1: (a: T) => A
): (a: T) => T;
export function compose(
  ...fns: Array<(input: unknown) => unknown>
): (input: unknown) => unknown {
  return (input: unknown) =>
    fns.reduceRight((acc, fn) => fn(acc), input);
}
