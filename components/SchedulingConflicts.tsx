"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Users, Calendar, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface Conflict {
  courseA: string;
  courseB: string;
  overlap: number;
  rarityImpact: string;
  seniorityImpact: string;
  conflictLevel: number;
  explanation: string;
}

interface ConflictsReport {
  semester: string;
  conflicts: Conflict[];
  message?: string;
}

interface SchedulingConflictsProps {
  className?: string;
}

export default function SchedulingConflicts({ className = "" }: SchedulingConflictsProps) {
  const [report, setReport] = useState<ConflictsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState("sp2026");
  const [expandedConflicts, setExpandedConflicts] = useState<Set<number>>(new Set());
  const [showAllConflicts, setShowAllConflicts] = useState(false);

  const semesters = [
    { value: "fa2024", label: "Fall 2024" },
    { value: "sp2025", label: "Spring 2025" },
    { value: "fa2025", label: "Fall 2025" },
    { value: "sp2026", label: "Spring 2026" },
    { value: "fa2026", label: "Fall 2026" },
  ];


  const fetchConflicts = async (semester: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/scheduling-conflicts?semester=${semester}`);
      if (!response.ok) {
        throw new Error("Failed to fetch scheduling conflicts");
      }
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts(selectedSemester);
  }, [selectedSemester]);

  const toggleConflictExpansion = (index: number) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConflicts(newExpanded);
  };

  const getConflictLevelColor = (level: number) => {
    if (level >= 0.4) return "text-red-600 bg-red-50 border-red-200";
    if (level >= 0.3) return "text-orange-600 bg-orange-50 border-orange-200";
    if (level >= 0.2) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getConflictLevelLabel = (level: number) => {
    if (level >= 0.4) return "High Priority";
    if (level >= 0.3) return "Medium Priority";
    if (level >= 0.2) return "Low Priority";
    return "Info";
  };

  const displayedConflicts = showAllConflicts ? report?.conflicts : report?.conflicts?.slice(0, 3);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Scheduling Conflicts Report
              </h2>
              <p className="text-gray-600 text-sm">
                Course scheduling conflicts and student overlap analysis
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchConflicts(selectedSemester)}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh conflicts"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Semester Selector */}
        <div className="mt-3 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Semester:</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {semesters.map((semester) => (
              <option key={semester.value} value={semester.value}>
                {semester.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Analyzing conflicts...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              <div className="font-medium">Error loading conflicts</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          </div>
        )}

        {report && !loading && !error && (
          <>
            {/* Summary */}
            <div className="mb-6">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {semesters.find(s => s.value === report.semester)?.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {report.conflicts.length} conflict{report.conflicts.length !== 1 ? 's' : ''} detected
                  </span>
                </div>
              </div>
            </div>

            {/* No Conflicts Message */}
            {report.conflicts.length === 0 && report.message && (
              <div className="text-center py-8">
                <div className="text-green-600 text-lg font-medium mb-2">
                  ✅ No Conflicts Detected
                </div>
                <div className="text-gray-600">{report.message}</div>
              </div>
            )}

            {/* Conflicts List */}
            {report.conflicts.length > 0 && (
              <div className="space-y-4">
                {displayedConflicts?.map((conflict, index) => (
                  <div
                    key={`${conflict.courseA}-${conflict.courseB}`}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleConflictExpansion(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getConflictLevelColor(conflict.conflictLevel)}`}>
                            {getConflictLevelLabel(conflict.conflictLevel)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {conflict.courseA} vs {conflict.courseB}
                            </div>
                            <div className="text-sm text-gray-600">
                              {conflict.overlap} student{conflict.overlap !== 1 ? 's' : ''} affected
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              Level {conflict.conflictLevel.toFixed(2)}
                            </div>
                          </div>
                          {expandedConflicts.has(index) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedConflicts.has(index) && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="pt-4 space-y-3">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Explanation:</div>
                            <div className="text-sm text-gray-600">{conflict.explanation}</div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">Course Rarity:</div>
                              <div className="text-sm text-gray-600">{conflict.rarityImpact}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">Seniority Impact:</div>
                              <div className="text-sm text-gray-600">{conflict.seniorityImpact}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Show More/Less Button */}
                {report.conflicts.length > 3 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setShowAllConflicts(!showAllConflicts)}
                      className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {showAllConflicts ? (
                        <>
                          <ChevronUp className="h-4 w-4 inline mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 inline mr-1" />
                          Show All {report.conflicts.length} Conflicts
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
