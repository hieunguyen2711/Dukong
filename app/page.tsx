"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Calendar, Mail, Search, X, AlertTriangle } from "lucide-react";
import { useHighPriorityConflicts } from "../hooks/useHighPriorityConflicts";

interface Student {
  id: string;
  name: string;
  email: string;
  gradYear: number;
  expectedGraduation: string;
  totalCredits: number;
  completedCredits: number;
  plannedCredits: number;
}

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { highPriorityCount } = useHighPriorityConflicts();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Since we don't have a students list API, we'll read the JSON file directly
      const response = await fetch("/students.json");
      if (!response.ok) {
        throw new Error("Failed to fetch students data");
      }
      const data = await response.json();
      setStudents(data);
      setFilteredStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query) ||
        student.expectedGraduation.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const getGradYearColor = (gradYear: number) => {
    const currentYear = new Date().getFullYear();
    if (gradYear <= currentYear) return "text-red-600 bg-red-50";
    if (gradYear === currentYear + 1) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-lg text-gray-600 mt-4">Loading students...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <div className="text-red-800 text-center">
            <div className="text-lg font-semibold mb-2">
              Error Loading Students
            </div>
            <div className="mb-4">{error}</div>
            <button
              onClick={fetchStudents}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Academic Advisor Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage student four-year plans and track academic progress
            </p>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>
                  {filteredStudents.length} of {students.length} Students
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Academic Year 2025-2026</span>
              </div>
            </div>

            {/* Search Component */}
            <div className="relative max-w-md w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                    title="Clear search"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500">
                  {filteredStudents.length === 0
                    ? "No students found"
                    : `${filteredStudents.length} student${
                        filteredStudents.length === 1 ? "" : "s"
                      } found`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Scheduling Conflicts Link */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Scheduling Conflicts Report
                  </h2>
                  <p className="text-gray-600 text-sm">
                    View detailed course scheduling conflicts and student overlap analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {highPriorityCount > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium animate-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{highPriorityCount} High Priority</span>
                  </div>
                )}
                <Link
                  href="/conflicts"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    highPriorityCount > 0
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  View Conflicts Report
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        {filteredStudents.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No students found
            </h3>
            <p className="text-gray-500">
              No students match your search for "
              <span className="font-medium">{searchQuery}</span>". Try searching
              by name, email, student ID, or graduation term.
            </p>
            <button
              onClick={clearSearch}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Directory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Link
                key={student.id}
                href={`/student/${student.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {student.name}
                      </h3>
                      <div className="flex items-center space-x-1 text-gray-600 mt-1">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{student.email}</span>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getGradYearColor(
                        student.gradYear
                      )}`}
                    >
                      {student.gradYear}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Expected Graduation:
                      </span>
                      <span className="font-medium">
                        {student.expectedGraduation}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Credits:</span>
                      <span className="font-medium">
                        {student.totalCredits}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed:</span>
                      <span className="text-green-600 font-medium">
                        {student.completedCredits}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Planned:</span>
                      <span className="text-blue-600 font-medium">
                        {student.plannedCredits}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Academic Progress</span>
                      <span>
                        {Math.round(
                          (student.completedCredits / student.totalCredits) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (student.completedCredits / student.totalCredits) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="text-blue-600 text-sm font-medium hover:text-blue-700">
                      View Four-Year Plan →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
