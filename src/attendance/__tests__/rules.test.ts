import {
  dayStatus,
  distanceMeters,
  isWithinOfficeRadius,
  istDate,
  istMinutesOfDay,
  workedMinutes,
  ShiftConfig,
} from "../rules";

// General shift from the PRD: 10:30–19:30 IST, 15 min grace, 4h half-day.
const generalShift: ShiftConfig = {
  startTime: "10:30",
  endTime: "19:30",
  graceMinutes: 15,
  halfDayHours: 4,
};

/** Builds an ISO instant for a given IST wall-clock time on a given date. */
function ist(date: string, hh: number, mm: number): string {
  const [y, m, d] = date.split("-").map(Number);
  // IST is UTC+5:30 with no DST, so subtracting 5:30 from the IST wall
  // clock gives the equivalent UTC instant.
  const utc = new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30));
  return utc.toISOString();
}

describe("istDate / istMinutesOfDay", () => {
  it("rolls over to the next IST calendar date after 18:30 UTC", () => {
    // 2026-01-15T19:00:00Z + 5:30 = 2026-01-16T00:30 IST
    expect(istDate(new Date("2026-01-15T19:00:00.000Z"))).toBe("2026-01-16");
  });

  it("stays on the same IST calendar date before 18:30 UTC", () => {
    expect(istDate(new Date("2026-01-15T10:00:00.000Z"))).toBe("2026-01-15");
  });

  it("reports minutes since midnight IST", () => {
    expect(istMinutesOfDay(new Date(ist("2026-01-15", 10, 30)))).toBe(10 * 60 + 30);
  });
});

describe("workedMinutes", () => {
  it("is null when either timestamp is missing", () => {
    expect(workedMinutes(null, ist("2026-01-15", 19, 0))).toBeNull();
    expect(workedMinutes(ist("2026-01-15", 10, 30), null)).toBeNull();
  });

  it("computes the minutes between check-in and check-out", () => {
    const minutes = workedMinutes(ist("2026-01-15", 10, 30), ist("2026-01-15", 19, 30));
    expect(minutes).toBe(9 * 60);
  });
});

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters(12.9716, 77.5946, 12.9716, 77.5946)).toBeCloseTo(0, 3);
  });

  it("is symmetric", () => {
    const a = distanceMeters(12.9716, 77.5946, 12.98, 77.6);
    const b = distanceMeters(12.98, 77.6, 12.9716, 77.5946);
    expect(a).toBeCloseTo(b, 6);
  });

  it("matches a known approximate distance (~1.1 km over 0.01 deg latitude)", () => {
    const d = distanceMeters(12.9716, 77.5946, 12.9816, 77.5946);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });
});

describe("isWithinOfficeRadius", () => {
  const office = { latitude: 12.9716, longitude: 77.5946, radiusMeters: 100 };

  it("always passes for WFH, regardless of distance", () => {
    expect(isWithinOfficeRadius("wfh", 13.5, 78.5, office)).toBe(true);
  });

  it("passes for office mode within the radius", () => {
    expect(isWithinOfficeRadius("office", 12.9716, 77.5946, office)).toBe(true);
  });

  it("fails for office mode outside the radius", () => {
    expect(isWithinOfficeRadius("office", 13.0, 78.0, office)).toBe(false);
  });
});

describe("dayStatus", () => {
  const baseDate = "2026-01-15";

  it("is holiday_weekend when the date is a calendar day, before any other check", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: true,
        isOnApprovedLeave: true,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: ist(baseDate, 19, 30),
      })
    ).toBe("holiday_weekend");
  });

  it("is on_leave when covered by an approved leave", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: true,
        shift: generalShift,
        checkInAt: null,
        checkOutAt: null,
      })
    ).toBe("on_leave");
  });

  it("is absent when there is no check-in on a working day", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: null,
        checkOutAt: null,
      })
    ).toBe("absent");
  });

  it("is present for a check-in exactly at shift start", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: ist(baseDate, 19, 30),
      })
    ).toBe("present");
  });

  it("is present for a check-in exactly at the end of the grace period (boundary, not late)", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 45),
        checkOutAt: ist(baseDate, 19, 30),
      })
    ).toBe("present");
  });

  it("is late one minute past the end of the grace period", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 46),
        checkOutAt: ist(baseDate, 19, 30),
      })
    ).toBe("late");
  });

  it("is half_day for worked time one minute under the half-day threshold", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: ist(baseDate, 14, 29),
      })
    ).toBe("half_day");
  });

  it("is present (not half_day) for worked time exactly at the half-day threshold", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: ist(baseDate, 14, 30),
      })
    ).toBe("present");
  });

  it("is not yet missing_checkout while still within the same working day, before the deadline", () => {
    const now = new Date(ist(baseDate, 15, 0));
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: null,
        now,
      })
    ).toBe("present");
  });

  it("is missing_checkout once the same day's checkout deadline (shift end + grace) has passed", () => {
    const now = new Date(ist(baseDate, 19, 46));
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: null,
        now,
      })
    ).toBe("missing_checkout");
  });

  it("is missing_checkout for a past day that was never checked out, regardless of time of day now", () => {
    const now = new Date(ist("2026-01-16", 9, 0));
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: generalShift,
        checkInAt: ist(baseDate, 10, 30),
        checkOutAt: null,
        now,
      })
    ).toBe("missing_checkout");
  });

  it("falls back to present when no shift is configured", () => {
    expect(
      dayStatus({
        date: baseDate,
        isHoliday: false,
        isOnApprovedLeave: false,
        shift: null,
        checkInAt: ist(baseDate, 23, 59),
        checkOutAt: null,
      })
    ).toBe("present");
  });
});
