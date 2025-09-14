import { useState, useEffect } from 'react';

export function useClientTimezone() {
  const [clientTimezone, setClientTimezone] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setClientTimezone(timezone);
    } catch (error) {
      console.error('Error getting timezone:', error);
      setClientTimezone('Europe/Moscow'); // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  return { clientTimezone, loading };
}