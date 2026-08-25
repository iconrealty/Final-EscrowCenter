// Safari & Legacy WebKit Polyfills
// Ensures compatibility across Safari (macOS & iOS), WebViews, and legacy JS engines

// 1. Iterator global & Prototype (Required for pdfjs-dist 4+/5+/6+ & Safari/WebKit)
try {
  const getIteratorProto = () => {
    try {
      if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        return Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]() || {})) || {};
      }
    } catch {}
    return {};
  };

  const iterProto = getIteratorProto();

  if (typeof (globalThis as any).Iterator === 'undefined') {
    function Iterator() {}
    Iterator.prototype = iterProto;
    (Iterator as any).from = function (iterable: any) {
      if (iterable && typeof iterable[Symbol.iterator] === 'function') {
        return iterable[Symbol.iterator]();
      }
      if (iterable && typeof iterable.next === 'function') {
        return iterable;
      }
      return [][Symbol.iterator]();
    };

    (globalThis as any).Iterator = Iterator;
    if (typeof window !== 'undefined') {
      (window as any).Iterator = Iterator;
    }
    if (typeof self !== 'undefined') {
      (self as any).Iterator = Iterator;
    }
    if (typeof global !== 'undefined') {
      (global as any).Iterator = Iterator;
    }
  } else if (!(globalThis as any).Iterator.prototype) {
    (globalThis as any).Iterator.prototype = iterProto;
  }

  // Ensure Iterator.prototype.join or other helper checks don't fail
  if ((globalThis as any).Iterator && (globalThis as any).Iterator.prototype) {
    if (typeof (globalThis as any).Iterator.prototype.join !== 'function') {
      (globalThis as any).Iterator.prototype.join = function (separator = ',') {
        const parts: any[] = [];
        for (const item of this) {
          parts.push(item);
        }
        return parts.join(separator);
      };
    }
  }
} catch (e) {
  console.warn('Iterator polyfill warning:', e);
}

// 2. Promise.withResolvers (Required for pdfjs-dist & Safari < 17.4)
if (typeof Promise !== 'undefined' && typeof (Promise as any).withResolvers === 'undefined') {
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

// 3. Object.groupBy & Map.groupBy
if (typeof (Object as any).groupBy === 'undefined') {
  (Object as any).groupBy = function <T, K extends PropertyKey>(
    items: Iterable<T>,
    callbackFn: (item: T, index: number) => K
  ): Record<K, T[]> {
    const result = Object.create(null) as Record<K, T[]>;
    let index = 0;
    for (const item of items) {
      const key = callbackFn(item, index++);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    return result;
  };
}

if (typeof (Map as any).groupBy === 'undefined') {
  (Map as any).groupBy = function <T, K>(
    items: Iterable<T>,
    callbackFn: (item: T, index: number) => K
  ): Map<K, T[]> {
    const result = new Map<K, T[]>();
    let index = 0;
    for (const item of items) {
      const key = callbackFn(item, index++);
      if (!result.has(key)) {
        result.set(key, []);
      }
      result.get(key)!.push(item);
    }
    return result;
  };
}

// 4. Object.hasOwn
if (typeof Object.hasOwn === 'undefined') {
  Object.hasOwn = function (obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 5. Array.prototype.at
if (typeof Array.prototype.at === 'undefined') {
  Array.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 6. String.prototype.at
if (typeof String.prototype.at === 'undefined') {
  String.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this.charAt(n);
  };
}

// 7. Array.prototype.toSorted
if (typeof (Array.prototype as any).toSorted === 'undefined') {
  (Array.prototype as any).toSorted = function (compareFn?: (a: any, b: any) => number) {
    const copy = [...this];
    return copy.sort(compareFn);
  };
}

// 8. Array.prototype.toReversed
if (typeof (Array.prototype as any).toReversed === 'undefined') {
  (Array.prototype as any).toReversed = function () {
    return [...this].reverse();
  };
}

// 9. Array.prototype.toSpliced
if (typeof (Array.prototype as any).toSpliced === 'undefined') {
  (Array.prototype as any).toSpliced = function (start: number, deleteCount?: number, ...items: any[]) {
    const copy = [...this];
    if (deleteCount === undefined) {
      copy.splice(start);
    } else {
      copy.splice(start, deleteCount, ...items);
    }
    return copy;
  };
}

// 10. Array.prototype.findLast
if (typeof (Array.prototype as any).findLast === 'undefined') {
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

// 11. Array.prototype.findLastIndex
if (typeof (Array.prototype as any).findLastIndex === 'undefined') {
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

// 12. structuredClone fallback
if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = function <T>(obj: T): T {
    if (obj === undefined) return undefined as any;
    return JSON.parse(JSON.stringify(obj));
  };
}

// 13. URL.canParse (Safari < 17)
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

export {};
