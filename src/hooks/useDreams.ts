import { useEffect, useState, useCallback } from 'react';
import { getDatabase } from '../db/client';
import { dreams, Dream } from '../db/schema';
import { desc } from 'drizzle-orm';

export function useDreams() {
  const [data, setData] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDreams = useCallback(async () => {
    try {
      const db = getDatabase();
      const result = await db
        .select()
        .from(dreams)
        .orderBy(desc(dreams.createdAt));
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load dreams'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDreams();
  }, [fetchDreams]);

  return { dreams: data, isLoading, error, refetch: fetchDreams };
}
