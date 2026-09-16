import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AttendanceSummaryStats } from '../AttendanceSummaryStats';
import type { AttendanceSummary } from '@/types/attendance';
import '@/i18n';

describe('AttendanceSummaryStats', () => {
  it('renders nothing when summary is null', () => {
    const { container } = render(<AttendanceSummaryStats summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('correctly calculates attendance rate excluding excused days and rejected records', () => {
    // 2 present, 1 absent, 0 late, 2 excused = 5 valid days. 1 rejected record excluded (6 total logged).
    // Evaluated days = 5 valid - 2 excused = 3 working days.
    // Rate = 2 / 3 = 66.66% -> 67%
    const summary: AttendanceSummary = {
      total_days: 6,
      valid_days: 5,
      present_days: 2,
      absent_days: 1,
      late_days: 0,
      excused_days: 2,
      pending_count: 0,
      approved_count: 5,
      rejected_count: 1,
    };

    render(<AttendanceSummaryStats summary={summary} />);

    // Total days card shows valid count (5) and secondary note for 6 total
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/\(6/)).toBeInTheDocument();

    // Stats cards — present_days and excused_days both equal 2, so use getAllByText
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // present (2) and excused (2)
    expect(screen.getByText('1')).toBeInTheDocument(); // absent
    // late_days is 0 — multiple zeros may appear; assert at least one exists
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1); // late

    // Attendance Rate = 67%
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('handles 100% attendance when all recorded days are excused leaves', () => {
    const summary: AttendanceSummary = {
      total_days: 2,
      valid_days: 2,
      present_days: 0,
      absent_days: 0,
      late_days: 0,
      excused_days: 2,
      pending_count: 0,
      approved_count: 2,
      rejected_count: 0,
    };

    render(<AttendanceSummaryStats summary={summary} />);

    // Evaluated days = 0, but validDays > 0 -> 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles zero recorded days gracefully', () => {
    const summary: AttendanceSummary = {
      total_days: 0,
      valid_days: 0,
      present_days: 0,
      absent_days: 0,
      late_days: 0,
      excused_days: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
    };

    render(<AttendanceSummaryStats summary={summary} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('falls back seamlessly when valid_days is not provided in legacy API payloads', () => {
    const legacySummary = {
      total_days: 4,
      present_days: 3,
      absent_days: 0,
      late_days: 0,
      excused_days: 1,
      pending_count: 0,
      approved_count: 4,
      rejected_count: 0,
    } as AttendanceSummary;

    render(<AttendanceSummaryStats summary={legacySummary} />);

    // totalDays = 4, excused = 1 -> evaluated = 3. present = 3 / 3 = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
