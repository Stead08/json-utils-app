/**
 * Pipes a value through a series of functions (left-to-right composition)
 */
export function pipe<T>(value: T): T;
export function pipe<T, A>(value: T, fn1: (input: T) => A): A;
export function pipe<T, A, B>(
	value: T,
	fn1: (input: T) => A,
	fn2: (input: A) => B,
): B;
export function pipe<T, A, B, C>(
	value: T,
	fn1: (input: T) => A,
	fn2: (input: A) => B,
	fn3: (input: B) => C,
): C;
export function pipe<T, A, B, C, D>(
	value: T,
	fn1: (input: T) => A,
	fn2: (input: A) => B,
	fn3: (input: B) => C,
	fn4: (input: C) => D,
): D;
export function pipe<T, A, B, C, D, E>(
	value: T,
	fn1: (input: T) => A,
	fn2: (input: A) => B,
	fn3: (input: B) => C,
	fn4: (input: C) => D,
	fn5: (input: D) => E,
): E;
export function pipe(
	value: unknown,
	...fns: Array<(input: unknown) => unknown>
): unknown {
	return fns.reduce((acc, fn) => fn(acc), value);
}
