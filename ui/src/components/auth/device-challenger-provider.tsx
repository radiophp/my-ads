'use client';

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';

import type { RootState } from '@/lib/store';
import { DeviceChallengerDialog } from '@/components/auth/device-challenger-dialog';
import { deviceChanged } from '@/features/auth/authSlice';

export function DeviceChallengerProvider() {
  const dispatch = useDispatch();
  const router = useRouter();
  const deviceChangedFlag = useSelector((state: RootState) => state.auth.deviceChanged);
  const challengerDevice = useSelector((state: RootState) => state.auth.challengerDevice);
  const handleClose = useCallback(() => {
    dispatch(deviceChanged(null));
    router.push('/login');
  }, [dispatch, router]);

  return (
    <DeviceChallengerDialog
      open={deviceChangedFlag}
      challengerDevice={challengerDevice}
      onClose={handleClose}
    />
  );
}
