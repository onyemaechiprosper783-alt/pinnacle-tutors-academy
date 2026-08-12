'use client';

import { useParams } from 'next/navigation';
import { AttemptRunnerLoader } from '@/components/cbt/AttemptRunnerLoader';

export default function MockAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  return <AttemptRunnerLoader attemptId={params.attemptId} mode="mock" />;
}
