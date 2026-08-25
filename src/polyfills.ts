// Safari & Legacy WebKit Polyfills
// Ensures compatibility across Safari (macOS & iOS) and webviews

// 1. Promise.withResolvers (Required for pdfjs-dist & Safari < 17.4)
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

// 2. Object.hasOwn
if (typeof Object.hasOwn === 'undefined') {
  Object.hasOwn = function (obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 3. Array.prototype.at
if (typeof Array.prototype.at === 'undefined') {
  Array.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 4. String.prototype.at
if (typeof String.prototype.at === 'undefined') {
  String.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this.charAt(n);
  };
}

// 5. Array.prototype.toSorted
if (typeof (Array.prototype as any).toSorted === 'undefined') {
  (Array.prototype as any).toSorted = function (compareFn?: (a: any, b: any) => number) {
    const copy = [...this];
    return copy.sort(compareFn);
  };
}

// 6. Array.prototype.toReversed
if (typeof (Array.prototype as any).toReversed === 'undefined') {
  (Array.prototype as any).toReversed = function () {
    return [...this].reverse();
  };
}

// 7. Array.prototype.toSpliced
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

// 8. Array.prototype.findLast
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

// 9. Array.prototype.findLastIndex
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

// 10. structuredClone fallback
if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = function <T>(obj: T): T {
    if (obj === undefined) return undefined as any;
    return JSON.parse(JSON.stringify(obj));
  };
}

export {};
