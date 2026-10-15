declare module 'three';

declare module 'vanta/dist/vanta.fog.min' {
  import type * as THREE from 'three';

  interface VantaFogOptions {
    THREE: typeof THREE;
    el: HTMLElement;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    highlightColor?: number;
    midtoneColor?: number;
    lowlightColor?: number;
    baseColor?: number;
    blurFactor?: number;
    speed?: number;
    zoom?: number;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function FOG(options: VantaFogOptions): VantaEffect;
}
