/** Coordinates are in the viewport's native bohr coordinate system. */
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  /** Optional unit up direction; parallel view/up directions are rejected. */
  up?: [number, number, number];
}

export interface ViewportImage {
  dataUrl: string;
  width: number;
  height: number;
}

/** An app-owned port. It is never published globally by the viewport. */
export interface ViewportControl {
  getCamera(): CameraState;
  setCamera(state: CameraState): Promise<void>;
  fit(): Promise<void>;
  /** Positive horizontal advances azimuth; positive vertical raises the view. */
  orbit(horizontalDegrees: number, verticalDegrees: number): Promise<void>;
  /** A factor greater than one moves closer to the target. */
  zoom(factor: number): Promise<void>;
  getBackground(): string;
  setBackground(color: string): Promise<void>;
  capture(transparent?: boolean): Promise<ViewportImage>;
}
