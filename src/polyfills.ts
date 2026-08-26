// Polyfills for browser compatibility across Safari, WebKit, iOS, Firefox, and Chrome

// 1. Array.prototype.at
if (!Array.prototype.at) {
  Array.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 2. String.prototype.at
if (!String.prototype.at) {
  String.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 3. Array.prototype.findLast
if (!(Array.prototype as any).findLast) {
  (Array.prototype as any).findLast = function <T>(
    predicate: (value: T, index: number, array: T[]) => boolean,
    thisArg?: any
  ): T | undefined {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  };
}

// 4. Array.prototype.findLastIndex
if (!(Array.prototype as any).findLastIndex) {
  (Array.prototype as any).findLastIndex = function <T>(
    predicate: (value: T, index: number, array: T[]) => boolean,
    thisArg?: any
  ): number {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return i;
      }
    }
    return -1;
  };
}

// 5. Object.hasOwn
if (!Object.hasOwn) {
  Object.hasOwn = function (object: any, property: PropertyKey): boolean {
    if (object == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    return Object.prototype.hasOwnProperty.call(Object(object), property);
  };
}

// 6. structuredClone fallback
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function <T>(obj: T): T {
    if (obj === undefined) return undefined as any;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  };
}

// 7. Promise.withResolvers (Safari < 17.4)
if (typeof (Promise as any).withResolvers !== 'function') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// 8. Object.groupBy
if (typeof (Object as any).groupBy !== 'function') {
  (Object as any).groupBy = function <T, K extends PropertyKey>(
    items: Iterable<T>,
    callbackfn: (item: T, index: number) => K
  ): Partial<Record<K, T[]>> {
    const result: Partial<Record<K, T[]>> = {};
    let index = 0;
    for (const item of items) {
      const key = callbackfn(item, index++);
      if (!result[key]) {
        result[key] = [];
      }
      result[key]!.push(item);
    }
    return result;
  };
}

// 9. Map.groupBy
if (typeof (Map as any).groupBy !== 'function') {
  (Map as any).groupBy = function <T, K>(
    items: Iterable<T>,
    callbackfn: (item: T, index: number) => K
  ): Map<K, T[]> {
    const map = new Map<K, T[]>();
    let index = 0;
    for (const item of items) {
      const key = callbackfn(item, index++);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return map;
  };
}

// 10. URL.canParse (Safari < 17)
if (typeof (URL as any).canParse === 'undefined') {
  (URL as any).canParse = function (url: string, base?: string): boolean {
    try {
      new URL(url, base);
      return true;
    } catch {
      return false;
    }
  };
}

// 11. Iterator Prototype helper
if (typeof (globalThis as any).Iterator === 'undefined') {
  (globalThis as any).Iterator = class Iterator {};
}

export {};
