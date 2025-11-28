/**
 * Memoizes a function with a simple cache
 */
export const memoize = <Args extends unknown[], Result>(
	fn: (...args: Args) => Result,
): ((...args: Args) => Result) => {
	const cache = new Map<string, Result>();

	return (...args: Args): Result => {
		const key = JSON.stringify(args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	};
};

/**
 * Memoizes a function with a custom key generator
 */
export const memoizeWith = <Args extends unknown[], Result>(
	keyGen: (...args: Args) => string,
	fn: (...args: Args) => Result,
): ((...args: Args) => Result) => {
	const cache = new Map<string, Result>();

	return (...args: Args): Result => {
		const key = keyGen(...args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	};
};
