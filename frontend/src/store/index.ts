import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import lookupReducer from './slices/lookupSlice';
import profileReducer from './slices/profileSlice';
import companyReducer from './slices/companySlice';
import companyJoinReducer from './slices/companyJoinSlice';
import companyRepresentativesReducer from './slices/companyRepresentativesSlice';
import opportunityReducer from './slices/opportunitySlice';
import applicationReducer from './slices/applicationSlice';
import trainingAssignmentReducer from './slices/trainingAssignmentSlice';
import attendanceReducer from './slices/attendanceSlice';
import reportReducer from './slices/reportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    lookup: lookupReducer,
    profile: profileReducer,
    company: companyReducer,
    companyJoin: companyJoinReducer,
    companyRepresentatives: companyRepresentativesReducer,
    opportunity: opportunityReducer,
    application: applicationReducer,
    trainingAssignment: trainingAssignmentReducer,
    attendance: attendanceReducer,
    reports: reportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
