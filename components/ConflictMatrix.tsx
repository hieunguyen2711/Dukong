"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Users, Calendar, Clock } from "lucide-react";

interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  number: string;
}

interface ConflictMatrixData {
  semester: string;
  courses: Course[];
  matrix: number[][];
  conflicts?: any[];
  totalOffered?: number;
  totalPlanned?: number;
}

interface ConflictMatrixProps {
  semester: string;
  className?: string;
}

export default function ConflictMatrix({ semester, className = "" }: ConflictMatrixProps) {
  const [matrixData, setMatrixData] = useState<ConflictMatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/conflict-matrix?semester=${semester}`);
      if (!response.ok) {
        throw new Error("Failed to fetch conflict matrix");
      }
      const data = await response.json();
      setMatrixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [semester]);

  const getConflictLevelColor = (level: number) => {
    if (level >= 0.4) return "bg-red-100 text-red-800 border-red-200";
    if (level >= 0.3) return "bg-orange-100 text-orange-800 border-orange-200";
    if (level >= 0.2) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (level > 0) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-50 text-gray-500 border-gray-200";
  };

  const getConflictLevelLabel = (level: number) => {
    if (level >= 0.4) return "High";
    if (level >= 0.3) return "Medium";
    if (level >= 0.2) return "Low";
    if (level > 0) return "Info";
    return "None";
  };

  // Use the same data source as the main conflicts report
  const totalConflicts = matrixData?.conflicts?.length || 0;
  const highPriorityConflicts = matrixData?.conflicts?.filter((c: any) => c.conflictLevel >= 0.4).length || 0;
  const totalStudentsAffected = matrixData?.conflicts?.reduce((sum: number, c: any) => sum + c.overlap, 0) || 0;
  const averageConflictLevel = matrixData?.conflicts?.length ? 
    matrixData.conflicts.reduce((sum: number, c: any) => sum + c.conflictLevel, 0) / matrixData.conflicts.length : 0;

  const maxConflictLevel = matrixData?.matrix.reduce((max, row) => 
    Math.max(max, ...row), 0
  ) || 0;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Generating conflict matrix...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              <div className="font-medium">Error loading conflict matrix</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!matrixData || matrixData.courses.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-green-600 text-lg font-medium mb-2">
              ✅ No Courses Found
            </div>
            <div className="text-gray-600">No courses are planned for this semester.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Conflict Matrix Table
              </h3>
              <p className="text-gray-600 text-sm">
                A matrix showing conflict scores between courses offered in {semester}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-900">{totalConflicts}</div>
                <div className="text-sm text-blue-700">Total Conflicts</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-900">{highPriorityConflicts}</div>
                <div className="text-sm text-red-700">High Priority</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-900">{totalStudentsAffected}</div>
                <div className="text-sm text-green-700">Students Affected</div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-900">{averageConflictLevel.toFixed(2)}</div>
                <div className="text-sm text-purple-700">Avg. Conflict Level</div>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  {matrixData.courses.map((course) => (
                    <th
                      key={course.id}
                      className="border border-gray-300 bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="transform -rotate-45 origin-center whitespace-nowrap">
                        {course.code}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matrixData.courses.map((course, rowIndex) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50">
                      <div>
                        <div className="font-semibold">{course.code}</div>
                        <div className="text-xs text-gray-500 truncate max-w-32" title={course.title}>
                          {course.title}
                        </div>
                      </div>
                    </td>
                    {matrixData.matrix[rowIndex].map((conflictLevel, colIndex) => (
                      <td
                        key={`${course.id}-${matrixData.courses[colIndex].id}`}
                        className={`border border-gray-300 px-2 py-2 text-center text-sm font-medium ${getConflictLevelColor(conflictLevel)}`}
                        title={`${course.code} vs ${matrixData.courses[colIndex].code}: ${conflictLevel.toFixed(2)} (${getConflictLevelLabel(conflictLevel)} Priority)`}
                      >
                        {conflictLevel > 0 ? conflictLevel.toFixed(1) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Conflict Level Legend:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-red-800">High (≥0.4)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-orange-800">Medium (≥0.3)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-yellow-800">Low (≥0.2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-blue-800">Info (&gt;0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span className="text-gray-500">None (0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
