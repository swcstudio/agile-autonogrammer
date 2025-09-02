/**
 * Reactive Observable System
 * Powerful reactive programming primitives
 */

export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: any) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
  readonly closed: boolean;
}

export type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;
export type MonoTypeOperatorFunction<T> = OperatorFunction<T, T>;

/**
 * Observable implementation
 */
export class Observable<T> {
  private _subscribe: (observer: Observer<T>) => (() => void) | void;

  constructor(subscribe: (observer: Observer<T>) => (() => void) | void) {
    this._subscribe = subscribe;
  }

  /**
   * Subscribe to the observable
   */
  subscribe(
    observerOrNext?: Observer<T> | ((value: T) => void),
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription {
    const observer: Observer<T> = typeof observerOrNext === 'function'
      ? { next: observerOrNext, error, complete }
      : observerOrNext || {};

    let closed = false;
    const cleanup = this._subscribe({
      next: (value: T) => {
        if (!closed && observer.next) {
          try {
            observer.next(value);
          } catch (e) {
            if (observer.error) observer.error(e);
          }
        }
      },
      error: (err: any) => {
        if (!closed && observer.error) {
          closed = true;
          observer.error(err);
        }
      },
      complete: () => {
        if (!closed && observer.complete) {
          closed = true;
          observer.complete();
        }
      }
    });

    return {
      unsubscribe: () => {
        if (!closed) {
          closed = true;
          if (cleanup) cleanup();
        }
      },
      get closed() {
        return closed;
      }
    };
  }

  /**
   * Transform values with map operator
   */
  map<R>(project: (value: T, index: number) => R): Observable<R> {
    return new Observable<R>(observer => {
      let index = 0;
      return this.subscribe({
        next: value => {
          try {
            observer.next?.(project(value, index++));
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete
      }).unsubscribe;
    });
  }

  /**
   * Filter values
   */
  filter(predicate: (value: T, index: number) => boolean): Observable<T> {
    return new Observable<T>(observer => {
      let index = 0;
      return this.subscribe({
        next: value => {
          try {
            if (predicate(value, index++)) {
              observer.next?.(value);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete
      }).unsubscribe;
    });
  }

  /**
   * Take only the first n values
   */
  take(count: number): Observable<T> {
    return new Observable<T>(observer => {
      let taken = 0;
      const subscription = this.subscribe({
        next: value => {
          if (taken++ < count) {
            observer.next?.(value);
            if (taken >= count) {
              observer.complete?.();
              subscription.unsubscribe();
            }
          }
        },
        error: observer.error,
        complete: observer.complete
      });
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Skip the first n values
   */
  skip(count: number): Observable<T> {
    return new Observable<T>(observer => {
      let skipped = 0;
      return this.subscribe({
        next: value => {
          if (skipped++ >= count) {
            observer.next?.(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      }).unsubscribe;
    });
  }

  /**
   * Debounce values
   */
  debounceTime(dueTime: number): Observable<T> {
    return new Observable<T>(observer => {
      let timeoutId: any;
      let hasValue = false;
      let lastValue: T;

      return this.subscribe({
        next: value => {
          hasValue = true;
          lastValue = value;
          
          if (timeoutId) clearTimeout(timeoutId);
          
          timeoutId = setTimeout(() => {
            if (hasValue) {
              observer.next?.(lastValue);
              hasValue = false;
            }
          }, dueTime);
        },
        error: observer.error,
        complete: () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (hasValue) {
            observer.next?.(lastValue);
          }
          observer.complete?.();
        }
      }).unsubscribe;
    });
  }

  /**
   * Throttle values
   */
  throttleTime(duration: number): Observable<T> {
    return new Observable<T>(observer => {
      let lastEmitTime = 0;
      
      return this.subscribe({
        next: value => {
          const now = Date.now();
          if (now - lastEmitTime >= duration) {
            lastEmitTime = now;
            observer.next?.(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      }).unsubscribe;
    });
  }

  /**
   * Distinct values
   */
  distinctUntilChanged(compare?: (prev: T, curr: T) => boolean): Observable<T> {
    return new Observable<T>(observer => {
      let hasValue = false;
      let lastValue: T;
      
      return this.subscribe({
        next: value => {
          if (!hasValue || (compare ? !compare(lastValue, value) : lastValue !== value)) {
            hasValue = true;
            lastValue = value;
            observer.next?.(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      }).unsubscribe;
    });
  }

  /**
   * Merge with another observable
   */
  merge(other: Observable<T>): Observable<T> {
    return Observable.merge(this, other);
  }

  /**
   * Switch to another observable
   */
  switchMap<R>(project: (value: T, index: number) => Observable<R>): Observable<R> {
    return new Observable<R>(observer => {
      let index = 0;
      let innerSubscription: Subscription | null = null;
      
      const outerSubscription = this.subscribe({
        next: value => {
          if (innerSubscription) {
            innerSubscription.unsubscribe();
          }
          
          try {
            const inner = project(value, index++);
            innerSubscription = inner.subscribe({
              next: observer.next,
              error: observer.error
            });
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
      
      return () => {
        outerSubscription.unsubscribe();
        if (innerSubscription) {
          innerSubscription.unsubscribe();
        }
      };
    });
  }

  /**
   * Catch errors
   */
  catchError<R>(selector: (error: any) => Observable<R>): Observable<T | R> {
    return new Observable<T | R>(observer => {
      return this.subscribe({
        next: observer.next,
        error: (error: any) => {
          try {
            const caught = selector(error);
            caught.subscribe(observer);
          } catch (e) {
            observer.error?.(e);
          }
        },
        complete: observer.complete
      }).unsubscribe;
    });
  }

  /**
   * Convert to Promise
   */
  toPromise(): Promise<T> {
    return new Promise((resolve, reject) => {
      let lastValue: T;
      let hasValue = false;
      
      this.subscribe({
        next: value => {
          lastValue = value;
          hasValue = true;
        },
        error: reject,
        complete: () => {
          if (hasValue) {
            resolve(lastValue);
          } else {
            reject(new Error('No elements in sequence'));
          }
        }
      });
    });
  }

  // Static factory methods

  /**
   * Create observable from values
   */
  static of<T>(...values: T[]): Observable<T> {
    return new Observable<T>(observer => {
      for (const value of values) {
        observer.next?.(value);
      }
      observer.complete?.();
    });
  }

  /**
   * Create observable from array
   */
  static from<T>(arrayLike: ArrayLike<T> | Iterable<T>): Observable<T> {
    return new Observable<T>(observer => {
      try {
        for (const value of Array.from(arrayLike)) {
          observer.next?.(value);
        }
        observer.complete?.();
      } catch (error) {
        observer.error?.(error);
      }
    });
  }

  /**
   * Create observable from Promise
   */
  static fromPromise<T>(promise: Promise<T>): Observable<T> {
    return new Observable<T>(observer => {
      promise
        .then(value => {
          observer.next?.(value);
          observer.complete?.();
        })
        .catch(error => {
          observer.error?.(error);
        });
    });
  }

  /**
   * Create observable from event
   */
  static fromEvent<T = Event>(
    target: EventTarget,
    eventName: string
  ): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (event: Event) => {
        observer.next?.(event as T);
      };
      
      target.addEventListener(eventName, handler);
      
      return () => {
        target.removeEventListener(eventName, handler);
      };
    });
  }

  /**
   * Create interval observable
   */
  static interval(period: number): Observable<number> {
    return new Observable<number>(observer => {
      let count = 0;
      const id = setInterval(() => {
        observer.next?.(count++);
      }, period);
      
      return () => clearInterval(id);
    });
  }

  /**
   * Create timer observable
   */
  static timer(dueTime: number, period?: number): Observable<number> {
    return new Observable<number>(observer => {
      let count = 0;
      
      const timeoutId = setTimeout(() => {
        observer.next?.(count++);
        
        if (period !== undefined) {
          const intervalId = setInterval(() => {
            observer.next?.(count++);
          }, period);
          
          // Return cleanup that clears interval
          return () => clearInterval(intervalId);
        } else {
          observer.complete?.();
        }
      }, dueTime);
      
      return () => clearTimeout(timeoutId);
    });
  }

  /**
   * Merge multiple observables
   */
  static merge<T>(...sources: Observable<T>[]): Observable<T> {
    return new Observable<T>(observer => {
      let completed = 0;
      const subscriptions = sources.map(source =>
        source.subscribe({
          next: observer.next,
          error: observer.error,
          complete: () => {
            if (++completed === sources.length) {
              observer.complete?.();
            }
          }
        })
      );
      
      return () => {
        subscriptions.forEach(sub => sub.unsubscribe());
      };
    });
  }

  /**
   * Combine latest values from multiple observables
   */
  static combineLatest<T>(...sources: Observable<any>[]): Observable<T[]> {
    return new Observable<T[]>(observer => {
      const values: any[] = new Array(sources.length);
      const hasValues: boolean[] = new Array(sources.length).fill(false);
      let completed = 0;
      
      const subscriptions = sources.map((source, index) =>
        source.subscribe({
          next: value => {
            values[index] = value;
            hasValues[index] = true;
            
            if (hasValues.every(Boolean)) {
              observer.next?.([...values] as T[]);
            }
          },
          error: observer.error,
          complete: () => {
            if (++completed === sources.length) {
              observer.complete?.();
            }
          }
        })
      );
      
      return () => {
        subscriptions.forEach(sub => sub.unsubscribe());
      };
    });
  }

  /**
   * Create empty observable
   */
  static empty<T>(): Observable<T> {
    return new Observable<T>(observer => {
      observer.complete?.();
    });
  }

  /**
   * Create observable that never emits
   */
  static never<T>(): Observable<T> {
    return new Observable<T>(() => {});
  }

  /**
   * Create observable that throws error
   */
  static throwError<T>(error: any): Observable<T> {
    return new Observable<T>(observer => {
      observer.error?.(error);
    });
  }
}