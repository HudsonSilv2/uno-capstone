import { pipe, memoize, accumulate, filter } from '../../utils/functional-helpers';

describe('functional-helpers', () => {
  describe('pipe', () => {
    it('aplica as funções na ordem correta', () => {
      const add10 = (n: number) => n + 10;
      const double = (n: number) => n * 2;
      const result = pipe<number>(add10, double)(5);
      expect(result).toBe(30); // (5 + 10) * 2
    });

    it('retorna o valor original quando não recebe funções', () => {
      const result = pipe<number>()(7);
      expect(result).toBe(7);
    });
  });

  describe('memoize', () => {
    it('retorna o mesmo resultado para o mesmo argumento', () => {
      const fn = jest.fn((x: string) => x.length);
      const memoized = memoize(fn);

      expect(memoized('hello')).toBe(5);
      expect(memoized('hello')).toBe(5);
      // fn só deve ser chamada uma vez
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('chama a função normalmente para argumentos diferentes', () => {
      const fn = jest.fn((x: string) => x.toUpperCase());
      const memoized = memoize(fn);

      memoized('a');
      memoized('b');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('accumulate', () => {
    it('soma os elementos do array', () => {
      const result = accumulate([1, 2, 3, 4], (acc, cur) => acc + cur, 0);
      expect(result).toBe(10);
    });

    it('retorna o valor inicial com array vazio', () => {
      const result = accumulate([], (acc: number, cur: number) => acc + cur, 99);
      expect(result).toBe(99);
    });
  });

  describe('filter', () => {
    it('retorna apenas os itens que passam no predicado', () => {
      const result = filter([1, 2, 3, 4, 5], (n) => n % 2 === 0);
      expect(result).toEqual([2, 4]);
    });

    it('retorna array vazio quando nenhum item passa', () => {
      const result = filter(['Skip', 'Reverse'], (v) => v === 'Draw Two');
      expect(result).toEqual([]);
    });
  });
});
