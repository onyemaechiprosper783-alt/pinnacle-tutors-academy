'use client';

import { useParams } from 'next/navigation';
import { AttemptRunnerLoader } from '@/components/cbt/AttemptRunnerLoader';

export default function ChallengeAttemptPage() {
  const params = useParams<{ matchId: string }>();
  // utme_challenge behaves like cbt for the runner (timed, blind scoring) —
  // the distinguishing behavior (leaderboard write) happens server-side.
  return <AttemptRunnerLoader attemptId={params.matchId} mode="cbt" />;
}
