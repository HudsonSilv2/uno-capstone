// Pipe: aplica funções em sequência, passando o resultado de uma para a próxima
export function pipe<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (initial: T) => fns.reduce((acc, fn) => fn(acc), initial);
}

// Memoize: guarda o resultado de chamadas anteriores para evitar recálculo
export function memoize<T extends string | number, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache: Record<string, R> = {};
  return (arg: T) => {
    const key = String(arg);
    if (key in cache) return cache[key];
    cache[key] = fn(arg);
    return cache[key];
  };
}

// Accumulate: reduz um array a um valor acumulado (wrapper explícito de reduce)
export function accumulate<T, R>(arr: T[], reducer: (acc: R, cur: T) => R, initial: R): R {
  return arr.reduce(reducer, initial);
}

// Filter: retorna apenas os itens que passam no predicado
export function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate);
}
