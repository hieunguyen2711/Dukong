"use client";

import { useState, useEffect } from "react";

export function useHighPriorityConflicts() {
  const [highPriorityCount, setHighPriorityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighPriorityConflicts = async () => {
      try {
        setLoading(true);
        // Check all semesters for high priority conflicts
        const semesters = ["fa2024", "sp2025", "fa2025", "sp2026", "fa2026"];
        let totalHighPriority = 0;

        for (const semester of semesters) {
          try {
            const response = await fetch(`/api/scheduling-conflicts?semester=${semester}`);
            if (response.ok) {
              const data = await response.json();
              const highPriority = data.conflicts?.filter((c: any) => c.conflictLevel >= 0.4).length || 0;
              totalHighPriority += highPriority;
            }
          } catch (error) {
            console.warn(`Failed to fetch conflicts for ${semester}:`, error);
          }
        }

        setHighPriorityCount(totalHighPriority);
      } catch (error) {
        console.error("Failed to fetch high priority conflicts:", error);
        setHighPriorityCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchHighPriorityConflicts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchHighPriorityConflicts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { highPriorityCount, loading };
}
