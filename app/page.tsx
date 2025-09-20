"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Calendar,
  Mail,
  Search,
  X,
  Filter,
  SortAsc,
  Eye,
  EyeOff,
  AlertTriangle,
  Send,
  Bell,
} from "lucide-react";
import SchedulingConflicts from "../components/SchedulingConflicts";
import { useHighPriorityConflicts } from "../hooks/useHighPriorityConflicts";
import {
  isStudentAtRisk as checkStudentAtRisk,
  sendStudentMeetingRequest,
  sendBulkMeetingRequests,
} from "../utils/emailAlerts";

interface Student {
  id: string;
  name: string;
  email: string;
  gradYear: number;
  expectedGraduation: string;
  totalCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  plannedCredits: number;
}

// Sophisticated "At Risk" Logic
const isStudentAtRisk = (student: Student): boolean => {
  const CREDITS_NEEDED = 120;
  const MAX_CREDITS_PER_SEMESTER = 15; // Realistic maximum per semester
  const TYPICAL_CREDITS_PER_SEMESTER = 12; // More conservative estimate

  // Parse graduation term (e.g., "Spring 2025", "Fall 2025", "sp2026", "fa2026")
  let gradMatch = student.expectedGraduation.match(/(Spring|Fall)\s+(\d{4})/);

  // Handle short format like "sp2026", "fa2026"
  if (!gradMatch) {
    const shortMatch = student.expectedGraduation.match(/(sp|fa)(\d{4})/);
    if (shortMatch) {
      const [, shortSem, year] = shortMatch;
      gradMatch = [
        student.expectedGraduation,
        shortSem === "sp" ? "Spring" : "Fall",
        year,
      ];
    }
  }

  if (!gradMatch) return false;

  const [, gradSemester, gradYearStr] = gradMatch;
  const gradYear = parseInt(gradYearStr);

  // Calculate current semester info
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 0-based to 1-based
  const isSpring = currentMonth <= 7; // Jan-July = Spring semester period

  // Calculate semesters remaining until graduation
  let semestersRemaining = 0;

  if (gradYear > currentYear) {
    // Graduating in a future year
    const yearsRemaining = gradYear - currentYear;
    semestersRemaining = yearsRemaining * 2;

    // Adjust for current semester position and graduation semester
    if (isSpring && gradSemester === "Spring") {
      semestersRemaining -= 1; // Spring to Spring
    } else if (!isSpring && gradSemester === "Fall") {
      semestersRemaining += 0; // Fall to Fall
    } else if (isSpring && gradSemester === "Fall") {
      semestersRemaining -= 0.5; // Spring to Fall (half year less)
    } else {
      semestersRemaining -= 1.5; // Fall to Spring (1.5 years less)
    }
  } else if (gradYear === currentYear) {
    // Graduating this year
    if (gradSemester === "Spring" && isSpring) {
      semestersRemaining = 1; // Currently in spring, graduating spring
    } else if (gradSemester === "Fall" && !isSpring) {
      semestersRemaining = 1; // Currently in fall, graduating fall
    } else if (gradSemester === "Fall" && isSpring) {
      semestersRemaining = 1; // Currently in spring, graduating fall
    } else {
      semestersRemaining = 0; // Should have already graduated
    }
  } else {
    // Graduation date is in the past
    return true; // Definitely at risk if past graduation date
  }

  // Ensure minimum of 0 semesters
  semestersRemaining = Math.max(0, semestersRemaining);

  // Calculate credits earned and needed
  const creditsCompleted = student.completedCredits || 0;
  const creditsInProgress = student.inProgressCredits || 0;
  const totalCreditsEarnedOrInProgress = creditsCompleted + creditsInProgress;
  const creditsStillNeeded = Math.max(
    0,
    CREDITS_NEEDED - totalCreditsEarnedOrInProgress
  );

  // Risk assessment scenarios

  // 1. Already past graduation date with insufficient credits
  if (semestersRemaining <= 0 && creditsStillNeeded > 0) {
    return true;
  }

  // 2. No time remaining
  if (semestersRemaining <= 0) {
    return false; // Should be graduating, not at risk if they have enough credits
  }

  // 3. Check if they can realistically complete remaining credits
  const maxPossibleCredits = semestersRemaining * MAX_CREDITS_PER_SEMESTER;
  const typicalPossibleCredits =
    semestersRemaining * TYPICAL_CREDITS_PER_SEMESTER;

  // Definitely at risk if impossible even with max load
  if (creditsStillNeeded > maxPossibleCredits) {
    return true;
  }

  // At risk if they need more than typical course load
  if (creditsStillNeeded > typicalPossibleCredits) {
    return true;
  }

  // 4. Special case: Very close to graduation but behind schedule
  if (
    semestersRemaining <= 1 &&
    creditsStillNeeded > MAX_CREDITS_PER_SEMESTER * 0.8
  ) {
    return true; // Need more than 80% of max load in final semester
  }

  // 5. Early warning: More than 2 years out but significantly behind
  if (semestersRemaining >= 4) {
    const expectedCreditsAtThisPoint =
      (8 - semestersRemaining) * TYPICAL_CREDITS_PER_SEMESTER;
    if (totalCreditsEarnedOrInProgress < expectedCreditsAtThisPoint * 0.7) {
      return true; // Less than 70% of expected progress
    }
  }

  return false; // Not at risk
};

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "gradYear">(
    "name"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [filterGradYear, setFilterGradYear] = useState<string>("all");
  const [filterProgress, setFilterProgress] = useState<string>("all");
  const { highPriorityCount } = useHighPriorityConflicts();

  // Meeting request states
  const [advisorName, setAdvisorName] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  // Advanced filtering and sorting functionality
  useEffect(() => {
    let filtered = students;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.id.toLowerCase().includes(query) ||
          student.expectedGraduation.toLowerCase().includes(query)
      );
    }

    // Graduation year filter
    if (filterGradYear !== "all") {
      const currentYear = new Date().getFullYear();
      const targetYear = parseInt(filterGradYear);
      filtered = filtered.filter((student) => student.gradYear === targetYear);
    }

    // Progress filter
    if (filterProgress !== "all") {
      filtered = filtered.filter((student) => {
        const progressPercent = (student.completedCredits / 120) * 100;
        switch (filterProgress) {
          case "low":
            return progressPercent < 25;
          case "medium":
            return progressPercent >= 25 && progressPercent < 75;
          case "high":
            return progressPercent >= 75;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let result = 0;
      
      switch (sortBy) {
        case "name":
          result = a.name.localeCompare(b.name);
          break;
        case "progress":
          // Use consistent progress calculation (completed + in progress)
          const progressA = (a.completedCredits + a.inProgressCredits) / 120;
          const progressB = (b.completedCredits + b.inProgressCredits) / 120;
          result = progressB - progressA; // Higher progress first by default
          break;
        case "gradYear":
          result = a.gradYear - b.gradYear;
          break;
        default:
          result = 0;
      }
      
      // Apply sort direction
      return sortDirection === "desc" ? -result : result;
    });

    setFilteredStudents(filtered);
  }, [searchQuery, students, filterGradYear, filterProgress, sortBy, sortDirection]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleSortChange = (newSortBy: "name" | "progress" | "gradYear") => {
    if (sortBy === newSortBy) {
      // Toggle direction if same sort field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new sort field with default direction
      setSortBy(newSortBy);
      setSortDirection("asc");
    }
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

            {/* Enhanced Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* Meeting Request Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Send meeting requests to all at-risk students"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Request Meetings</span>
                </button>
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
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    aria-label="Search students"
                    aria-describedby="search-results"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
                <div
                  id="search-results"
                  className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500"
                >
                  {searchQuery &&
                    (filteredStudents.length === 0
                      ? "No students found"
                      : `${filteredStudents.length} student${
                          filteredStudents.length === 1 ? "" : "s"
                        } found`)}
                </div>
              </div>

              {/* Filter and Sort Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                    showFilters
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-label="Toggle filters"
                  aria-expanded={showFilters}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    handleSortChange(
                      e.target.value as "name" | "progress" | "gradYear"
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                  aria-label="Sort students by"
                >
                  <option value="name">Sort by Name</option>
                  <option value="progress">Sort by Progress</option>
                  <option value="gradYear">Sort by Grad Year</option>
                </select>

                <button
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                  title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                >
                  <SortAsc className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                  <span className="hidden sm:inline text-sm">
                    {sortDirection === "asc" ? "A-Z" : "Z-A"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="grad-year-filter"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Graduation Year
                </label>
                <select
                  id="grad-year-filter"
                  value={filterGradYear}
                  onChange={(e) => setFilterGradYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  aria-label="Filter by graduation year"
                >
                  <option value="all">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="progress-filter"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Progress Level
                </label>
                <select
                  id="progress-filter"
                  value={filterProgress}
                  onChange={(e) => setFilterProgress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  aria-label="Filter by progress level"
                >
                  <option value="all">All Progress Levels</option>
                  <option value="low">Low Progress (&lt;25%)</option>
                  <option value="medium">Medium Progress (25-75%)</option>
                  <option value="high">High Progress (&gt;75%)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterGradYear("all");
                    setFilterProgress("all");
                    setSearchQuery("");
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  aria-label="Clear all filters"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    View detailed course scheduling conflicts and student
                    overlap analysis
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Student Directory
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredStudents.map((student, index) => {
                const progressPercent = Math.round(
                  ((student.completedCredits + student.inProgressCredits) /
                    120) *
                    100
                );
                const isAtRisk = checkStudentAtRisk(student);

                return (
                  <Link
                    key={student.id}
                    href={`/student/${student.id}`}
                    className={`bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isAtRisk
                        ? "border-red-200 bg-red-50/30"
                        : "border-gray-200"
                    }`}
                    aria-label={`View ${student.name}'s academic plan. Progress: ${progressPercent}%`}
                    tabIndex={0}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {student.name}
                          </h3>
                          <div className="flex items-center space-x-1 text-gray-600 mt-1">
                            <Mail
                              className="h-4 w-4 flex-shrink-0"
                              aria-hidden="true"
                            />
                            <span className="text-sm truncate">
                              {student.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getGradYearColor(
                              student.gradYear
                            )}`}
                            aria-label={`Graduation year: ${student.gradYear}`}
                          >
                            {student.gradYear}
                          </div>
                          {isAtRisk && (
                            <div className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              At Risk
                            </div>
                          )}
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
                          <span className="text-gray-600">In Progress:</span>
                          <span className="text-yellow-600 font-medium">
                            {student.inProgressCredits}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Planned:</span>
                          <span className="text-blue-600 font-medium">
                            {student.plannedCredits}
                          </span>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span className="font-medium">Academic Progress</span>
                          <span className="font-semibold">
                            {progressPercent}% Complete
                          </span>
                        </div>
                        <div
                          className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progressPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Academic progress: ${progressPercent}% complete`}
                        >
                          {/* Completed credits (green) */}
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-l-full transition-all duration-500 ease-out"
                            style={{
                              width: `${
                                (student.completedCredits / 120) * 100
                              }%`,
                            }}
                            aria-label={`${student.completedCredits} credits completed`}
                          ></div>
                          {/* In progress credits (yellow) */}
                          <div
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 absolute top-0 transition-all duration-500 ease-out"
                            style={{
                              left: `${
                                (student.completedCredits / 120) * 100
                              }%`,
                              width: `${
                                (student.inProgressCredits / 120) * 100
                              }%`,
                            }}
                            aria-label={`${student.inProgressCredits} credits in progress`}
                          ></div>
                          {/* Planned credits (blue) */}
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 absolute top-0 transition-all duration-500 ease-out"
                            style={{
                              left: `${
                                ((student.completedCredits +
                                  student.inProgressCredits) /
                                  120) *
                                100
                              }%`,
                              width: `${(student.plannedCredits / 120) * 100}%`,
                            }}
                            aria-label={`${student.plannedCredits} credits planned`}
                          ></div>
                        </div>

                        {/* Progress Legend */}
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{student.completedCredits} completed</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span>{student.inProgressCredits} in progress</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{student.plannedCredits} planned</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors duration-200">
                          View Four-Year Plan →
                        </span>
                        {isAtRisk && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedStudent(student);
                              setShowRequestModal(true);
                            }}
                            disabled={sendingRequest}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-xs disabled:opacity-50"
                            title="Send meeting request to this student"
                          >
                            <Send className="w-3 h-3" />
                            <span>Meet</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Dashboard */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Academic Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {students.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg Progress
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {students.length > 0
                      ? Math.round(
                          students.reduce(
                            (acc, student) =>
                              acc + (student.completedCredits / 120) * 100,
                            0
                          ) / students.length
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">At Risk</p>
                  <p className="text-3xl font-bold text-red-600">
                    {
                      students.filter((student) => isStudentAtRisk(student))
                        .length
                    }
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Eye className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Track</p>
                  <p className="text-3xl font-bold text-green-600">
                    {
                      students.filter((student) => {
                        const progress = (student.completedCredits / 120) * 100;
                        return progress >= 75;
                      }).length
                    }
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduling Conflicts Section */}
        <div className="mt-12">
          <SchedulingConflicts />
        </div>

        {/* Meeting Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedStudent
                    ? `Send Meeting Request to ${selectedStudent.name}`
                    : "Send Meeting Requests"}
                </h3>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedStudent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="advisor-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Name (Advisor)
                </label>
                <input
                  id="advisor-name"
                  type="text"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  placeholder="Dr. Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-800 mb-2">
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">Meeting Request Summary</span>
                </div>
                <p className="text-sm text-blue-700">
                  {selectedStudent
                    ? `This will send a meeting request to ${selectedStudent.name} asking them to schedule a meeting with you.`
                    : `This will send meeting requests to ${
                        students.filter((s) => checkStudentAtRisk(s)).length
                      } at-risk students asking them to schedule a meeting with you.`}
                </p>
              </div>

              {requestMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg ${
                    requestMessage.includes("successfully") ||
                    requestMessage.includes("Success")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {requestMessage}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    selectedStudent
                      ? () => sendSingleMeetingRequest(selectedStudent)
                      : handleBulkMeetingRequests
                  }
                  disabled={sendingRequest || !advisorName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {sendingRequest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {selectedStudent ? "Send Request" : "Send Requests"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
