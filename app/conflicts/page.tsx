"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Users, Calendar, ChevronDown, ChevronUp, RefreshCw, ArrowLeft, TrendingUp, Clock, GraduationCap } from "lucide-react";
import Link from "next/link";
import ConflictMatrix from "../../components/ConflictMatrix";

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
  totalOffered?: number;
  totalPlanned?: number;
}

export default function ConflictsPage() {
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

  const getConflictLevelIcon = (level: number) => {
    if (level >= 0.4) return "🔴";
    if (level >= 0.3) return "🟠";
    if (level >= 0.2) return "🟡";
    return "🔵";
  };

  const displayedConflicts = showAllConflicts ? report?.conflicts : report?.conflicts?.slice(0, 10);

  // Calculate summary statistics
  const highPriorityConflicts = report?.conflicts.filter(c => c.conflictLevel >= 0.4).length || 0;
  const totalStudentsAffected = report?.conflicts.reduce((sum, c) => sum + c.overlap, 0) || 0;
  const averageConflictLevel = report?.conflicts.length ? 
    report.conflicts.reduce((sum, c) => sum + c.conflictLevel, 0) / report.conflicts.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Scheduling Conflicts Report
              </h1>
              <p className="text-gray-600">
                Course scheduling conflicts and student overlap analysis
              </p>
            </div>
            <button
              onClick={() => fetchConflicts(selectedSemester)}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Semester Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-lg font-medium text-gray-700">Select Semester:</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {semesters.map((semester) => (
                <option key={semester.value} value={semester.value}>
                  {semester.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Statistics */}
        {report && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{report.conflicts.length}</div>
                  <div className="text-sm text-gray-600">Total Conflicts</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{highPriorityConflicts}</div>
                  <div className="text-sm text-gray-600">High Priority</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalStudentsAffected}</div>
                  <div className="text-sm text-gray-600">Students Affected</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{averageConflictLevel.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Avg. Conflict Level</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Course Offering Information */}
        {report && !loading && !error && report.totalOffered !== undefined && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <span className="font-medium">{report.totalOffered}</span> courses offered in {semesters.find(s => s.value === report.semester)?.label} 
                out of <span className="font-medium">{report.totalPlanned}</span> courses planned by students
              </div>
            </div>
          </div>
        )}

        {/* Conflict Matrix */}
        <ConflictMatrix semester={selectedSemester} className="mb-8" />

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-lg text-gray-600">Analyzing conflicts...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6">
              <div className="text-red-800">
                <div className="font-medium text-lg">Error loading conflicts</div>
                <div className="text-sm mt-2">{error}</div>
              </div>
            </div>
          )}

          {report && !loading && !error && (
            <div className="p-6">
              {/* No Conflicts Message */}
              {report.conflicts.length === 0 && report.message && (
                <div className="text-center py-12">
                  <div className="text-green-600 text-2xl font-medium mb-4">
                    ✅ No Conflicts Detected
                  </div>
                  <div className="text-gray-600 text-lg">{report.message}</div>
                </div>
              )}

              {/* Conflicts List */}
              {report.conflicts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Conflict Details
                    </h2>
                    <div className="text-sm text-gray-600">
                      Showing {displayedConflicts?.length} of {report.conflicts.length} conflicts
                    </div>
                  </div>

                  {displayedConflicts?.map((conflict, index) => (
                    <div
                      key={`${conflict.courseA}-${conflict.courseB}`}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleConflictExpansion(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">
                              {getConflictLevelIcon(conflict.conflictLevel)}
                            </div>
                            <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getConflictLevelColor(conflict.conflictLevel)}`}>
                              {getConflictLevelLabel(conflict.conflictLevel)}
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-gray-900">
                                {conflict.courseA} vs {conflict.courseB}
                              </div>
                              <div className="text-sm text-gray-600">
                                {conflict.overlap} student{conflict.overlap !== 1 ? 's' : ''} affected
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                Level {conflict.conflictLevel.toFixed(2)}
                              </div>
                            </div>
                            {expandedConflicts.has(index) ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedConflicts.has(index) && (
                        <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50">
                          <div className="pt-6 space-y-4">
                            <div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">Explanation:</div>
                              <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                {conflict.explanation}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-2">Course Rarity:</div>
                                <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                  {conflict.rarityImpact}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-2">Seniority Impact:</div>
                                <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                  {conflict.seniorityImpact}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Show More/Less Button */}
                  {report.conflicts.length > 10 && (
                    <div className="text-center pt-6">
                      <button
                        onClick={() => setShowAllConflicts(!showAllConflicts)}
                        className="px-6 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                      >
                        {showAllConflicts ? (
                          <>
                            <ChevronUp className="h-5 w-5 inline mr-2" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-5 w-5 inline mr-2" />
                            Show All {report.conflicts.length} Conflicts
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

