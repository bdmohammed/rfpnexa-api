export class Clock {
  /**
   * Freezes system time to a fixed timestamp
   */
  static freeze(targetDate: Date = new Date()): void {
    jest.useFakeTimers();
    jest.setSystemTime(targetDate);
  }

  /**
   * Advances the fake system clock by specified milliseconds
   */
  static advance(ms: number): void {
    jest.advanceTimersByTime(ms);
  }

  /**
   * Advances system clock by specified number of hours
   */
  static travelHours(hours: number): void {
    this.advance(hours * 60 * 60 * 1000);
  }

  /**
   * Advances system clock by specified number of days
   */
  static travelDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  /**
   * Advances system clock to tomorrow (24 hours ahead)
   */
  static travelToTomorrow(): void {
    this.travelDays(1);
  }

  /**
   * Restores system clock to real hardware time
   */
  static reset(): void {
    jest.useRealTimers();
  }
}
