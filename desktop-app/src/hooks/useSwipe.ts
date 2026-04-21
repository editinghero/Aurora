import { useEffect, useRef, type RefObject } from "react";

type Handlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
};

export function useSwipe<T extends HTMLElement>(
  ref: RefObject<T>,
  handlers: Handlers,
  threshold = 50,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let pointerId: number | null = null;

    const reset = () => {
      tracking = false;
      pointerId = null;
    };

    const begin = (x: number, y: number, id: number) => {
      startX = x;
      startY = y;
      startT = performance.now();
      tracking = true;
      pointerId = id;
    };

    const finish = (x: number, y: number, id: number) => {
      if (!tracking || pointerId !== id) return;
      const dx = x - startX;
      const dy = y - startY;
      const dt = performance.now() - startT;
      reset();
      if (dt > 650) return;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < threshold) return;

      const h = handlersRef.current;
      if (absX > absY) {
        if (dx < 0) h.onSwipeLeft?.();
        else h.onSwipeRight?.();
      } else if (dy < 0) {
        h.onSwipeUp?.();
      } else {
        h.onSwipeDown?.();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      begin(e.clientX, e.clientY, e.pointerId);
    };

    const onPointerUp = (e: PointerEvent) => finish(e.clientX, e.clientY, e.pointerId);
    const onPointerCancel = () => reset();

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerCancel, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [ref, threshold]);
}

/** Attach swipe-down-to-close to any element (e.g. sheet content). */
export function useSwipeDownClose<T extends HTMLElement>(
  ref: RefObject<T>,
  onClose: () => void,
  enabled = true,
  threshold = 56,
) {
  const cbRef = useRef(onClose);
  cbRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let pointerId: number | null = null;

    const reset = () => {
      tracking = false;
      pointerId = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      startX = e.clientX;
      startY = e.clientY;
      startT = performance.now();
      tracking = true;
      pointerId = e.pointerId;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!tracking || pointerId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dt = performance.now() - startT;
      reset();
      if (dt > 700) return;
      if (dy > threshold && dy > Math.abs(dx) * 1.12) cbRef.current();
    };

    const onPointerCancel = () => reset();

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerCancel, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [ref, enabled, threshold]);
}
