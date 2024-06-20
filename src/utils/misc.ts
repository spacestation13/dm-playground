import { EventEmitter } from '@angular/core';
import { take } from 'rxjs';

export function once<T extends EventEmitter<any>>(eventSource: T) {
  return new Promise((resolve) => eventSource.pipe(take(1)).subscribe(resolve));
}

export function dynamic_import(url: string) {
  return import(/* @vite-ignore */ url);
}
