import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Universal defensive polyfills for iframe sandboxes and embedded webviews
if (typeof window !== 'undefined') {
  if (typeof (window as any).IntersectionObserver === 'undefined') {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '0px';
      readonly thresholds: ReadonlyArray<number> = [0];
      private callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element): void {
        setTimeout(() => {
          this.callback(
            [
              {
                time: Date.now(),
                target,
                isIntersecting: true,
                intersectionRatio: 1,
                boundingClientRect: target.getBoundingClientRect?.() || ({} as any),
                intersectionRect: target.getBoundingClientRect?.() || ({} as any),
                rootBounds: null,
              } as IntersectionObserverEntry,
            ],
            this
          );
        }, 0);
      }
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    (window as any).IntersectionObserver = MockIntersectionObserver;
  }

  if (typeof (window as any).ResizeObserver === 'undefined') {
    class MockResizeObserver implements ResizeObserver {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element): void {
        setTimeout(() => {
          const rect = target.getBoundingClientRect?.() || ({} as any);
          this.callback(
            [
              {
                target,
                contentRect: rect,
                borderBoxSize: [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
              } as ResizeObserverEntry,
            ],
            this
          );
        }, 0);
      }
      unobserve(): void {}
      disconnect(): void {}
    }
    (window as any).ResizeObserver = MockResizeObserver;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

