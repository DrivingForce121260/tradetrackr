export type TelemetryEvent = {
  name: string;
  properties?: Record<string, any>;
};

// Lightweight telemetry stub. Replace with real analytics backend if needed.
export function logEvent(event: TelemetryEvent): void {
  try {
    // In production, route to your analytics backend instead of console
    console.info('Telemetry', event.name, event.properties ?? {});
  } catch {
    // Non-fatal
  }
}


