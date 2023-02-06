import { TypedEmitter } from "tiny-typed-emitter";
import { onMounted, onUnmounted } from "vue";

type GetListenerSignature<T> = T extends TypedEmitter<infer L> ? L : never;
export function useEventListener<
  T extends TypedEmitter<any>,
  L extends GetListenerSignature<T>,
  E extends keyof L,
>(target: T, eventName: E, callback: L[E]) {
  onMounted(() => {
    target.on(eventName as string, callback);
  });
  onUnmounted(() => {
    target.off(eventName as string, callback);
  });
}
