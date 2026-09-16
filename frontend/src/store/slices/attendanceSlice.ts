import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type {
  AttendanceRecordItem,
  AttendanceSummary,
  RecordAttendancePayload,
  AttendanceFilterParams,
} from '@/types/attendance';

export interface AttendanceState {
  records: AttendanceRecordItem[];
  summary: AttendanceSummary | null;
  isFetching: boolean;
  fetchError: string | null;

  isRecording: boolean;
  recordError: string | null;
  recordErrorCode: string | null;

  isApproving: boolean;
  isRejecting: boolean;
  actionError: string | null;
}

const initialState: AttendanceState = {
  records: [],
  summary: null,
  isFetching: false,
  fetchError: null,

  isRecording: false,
  recordError: null,
  recordErrorCode: null,

  isApproving: false,
  isRejecting: false,
  actionError: null,
};

/**
 * Fetch attendance records and summary for a training assignment.
 * TEP-692 — GET /api/v1/training-assignments/{assignment}/attendance
 */
export const fetchAssignmentAttendance = createAsyncThunk<
  { data: AttendanceRecordItem[]; summary: AttendanceSummary },
  { assignmentId: number; params?: AttendanceFilterParams },
  { rejectValue: string }
>('attendance/fetchAssignmentAttendance', async ({ assignmentId, params }, { rejectWithValue }) => {
  try {
    const response = await api.get<{
      data: AttendanceRecordItem[];
      summary: AttendanceSummary;
    }>(`/training-assignments/${assignmentId}/attendance`, {
      params,
    });

    return {
      data: response.data.data,
      summary: response.data.summary,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load attendance records');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Record attendance for an assignment (company representative).
 * TEP-693 — POST /api/v1/training-assignments/{assignment}/attendance
 */
export const recordAttendance = createAsyncThunk<
  AttendanceRecordItem,
  { assignmentId: number; payload: RecordAttendancePayload },
  { rejectValue: { message: string; errorCode?: string } }
>('attendance/recordAttendance', async ({ assignmentId, payload }, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: AttendanceRecordItem }>(
      `/training-assignments/${assignmentId}/attendance`,
      payload
    );

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to record attendance',
        errorCode: err.response.data?.error_code,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Approve an attendance record (academic supervisor / coordinator).
 * TEP-694 — PATCH /api/v1/attendance-records/{record}/approve
 */
export const approveAttendanceRecord = createAsyncThunk<
  AttendanceRecordItem,
  number,
  { rejectValue: string }
>('attendance/approveAttendanceRecord', async (recordId, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ data: AttendanceRecordItem }>(
      `/attendance-records/${recordId}/approve`
    );

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to approve attendance record');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Reject an attendance record with reason (academic supervisor / coordinator).
 * TEP-694 — PATCH /api/v1/attendance-records/{record}/reject
 */
export const rejectAttendanceRecord = createAsyncThunk<
  AttendanceRecordItem,
  { recordId: number; reason: string },
  { rejectValue: string }
>('attendance/rejectAttendanceRecord', async ({ recordId, reason }, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ data: AttendanceRecordItem }>(
      `/attendance-records/${recordId}/reject`,
      { reason }
    );

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to reject attendance record');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearAttendance(state) {
      state.records = [];
      state.summary = null;
      state.fetchError = null;
      state.recordError = null;
      state.recordErrorCode = null;
      state.actionError = null;
    },
    clearRecordErrors(state) {
      state.recordError = null;
      state.recordErrorCode = null;
    },
  },
  extraReducers: (builder) => {
    // ── Fetch assignment attendance ──
    builder
      .addCase(fetchAssignmentAttendance.pending, (state) => {
        state.isFetching = true;
        state.fetchError = null;
      })
      .addCase(fetchAssignmentAttendance.fulfilled, (state, action) => {
        state.isFetching = false;
        state.records = action.payload.data;
        state.summary = action.payload.summary;
      })
      .addCase(fetchAssignmentAttendance.rejected, (state, action) => {
        state.isFetching = false;
        state.fetchError = action.payload ?? 'Failed to load attendance';
      });

    // ── Record attendance ──
    builder
      .addCase(recordAttendance.pending, (state) => {
        state.isRecording = true;
        state.recordError = null;
        state.recordErrorCode = null;
      })
      .addCase(recordAttendance.fulfilled, (state, action) => {
        state.isRecording = false;
        // Insert new record at the beginning if not already present
        const exists = state.records.some((r) => r.id === action.payload.id);
        if (!exists) {
          state.records.unshift(action.payload);
        }
        // Increment summary counts if summary exists
        if (state.summary) {
          state.summary.total_days += 1;
          if (action.payload.status === 'present') state.summary.present_days += 1;
          if (action.payload.status === 'absent') state.summary.absent_days += 1;
          if (action.payload.status === 'late') state.summary.late_days += 1;
          if (action.payload.status === 'excused') state.summary.excused_days += 1;
          state.summary.pending_count += 1;
        }
      })
      .addCase(recordAttendance.rejected, (state, action) => {
        state.isRecording = false;
        state.recordError = action.payload?.message ?? 'Failed to record attendance';
        state.recordErrorCode = action.payload?.errorCode ?? null;
      });

    // ── Approve attendance record ──
    builder
      .addCase(approveAttendanceRecord.pending, (state) => {
        state.isApproving = true;
        state.actionError = null;
      })
      .addCase(approveAttendanceRecord.fulfilled, (state, action) => {
        state.isApproving = false;
        const index = state.records.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
        if (state.summary) {
          state.summary.pending_count = Math.max(0, state.summary.pending_count - 1);
          state.summary.approved_count += 1;
        }
      })
      .addCase(approveAttendanceRecord.rejected, (state, action) => {
        state.isApproving = false;
        state.actionError = action.payload ?? 'Failed to approve attendance';
      });

    // ── Reject attendance record ──
    builder
      .addCase(rejectAttendanceRecord.pending, (state) => {
        state.isRejecting = true;
        state.actionError = null;
      })
      .addCase(rejectAttendanceRecord.fulfilled, (state, action) => {
        state.isRejecting = false;
        const index = state.records.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
        if (state.summary) {
          state.summary.pending_count = Math.max(0, state.summary.pending_count - 1);
          state.summary.rejected_count += 1;
        }
      })
      .addCase(rejectAttendanceRecord.rejected, (state, action) => {
        state.isRejecting = false;
        state.actionError = action.payload ?? 'Failed to reject attendance';
      });
  },
});

export const { clearAttendance, clearRecordErrors } = attendanceSlice.actions;
export default attendanceSlice.reducer;
