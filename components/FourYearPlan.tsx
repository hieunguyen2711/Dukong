"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Plus, Edit3, Save, X, Search } from "lucide-react";

interface Course {
  course_id: string;
  department: string;
  number: string;
  title: string;
  credits: number;
  status: "taken" | "planned" | "in_progress";
}

interface SemesterData {
  courses: Course[];
  semesterCredits: number;
  semesterStatus: "past" | "current" | "future";
  isGapSemester?: boolean;
  gapReason?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  gradYear: number;
  expectedGraduation: string;
  plan: Record<string, SemesterData>;
  totalCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  plannedCredits: number;
}

interface FourYearPlanProps {
  studentId: string;
}

const FourYearPlan: React.FC<FourYearPlanProps> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<{
    semester: string;
    courseId: string;
  } | null>(null);
  const [newCourse, setNewCourse] = useState({
    course_id: "",
    department: "",
    number: "",
    title: "",
    credits: 3,
  });
  const [addingToSemester, setAddingToSemester] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/student/${studentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch student data");
      }
      const data = await response.json();
      setStudent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const addCourse = async (semester: string, course: any) => {
    try {
      const response = await fetch("/api/addCourse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          semester,
          course: {
            ...course,
            status: "planned",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add course");
      }

      const updatedStudent = await response.json();
      setStudent(updatedStudent);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add course");
    }
  };

  const removeCourse = async (semester: string, courseId: string) => {
    if (!confirm("Are you sure you want to remove this course?")) {
      return;
    }

    try {
      const response = await fetch("/api/removeCourse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          semester,
          courseId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove course");
      }

      const updatedStudent = await response.json();
      setStudent(updatedStudent);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove course");
    }
  };

  const updateCourse = async (
    semester: string,
    oldCourseId: string,
    newCourseData: any
  ) => {
    try {
      const response = await fetch("/api/updateCourse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          semester,
          oldCourseId,
          newCourse: newCourseData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update course");
      }

      const updatedStudent = await response.json();
      setStudent(updatedStudent);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update course");
    }
  };

  const handleAddCourse = async (semester: string) => {
    if (!newCourse.course_id || !newCourse.title) {
      alert("Please fill in course ID and title");
      return;
    }

    await addCourse(semester, newCourse);
    setNewCourse({
      course_id: "",
      department: "",
      number: "",
      title: "",
      credits: 3,
    });
    setAddingToSemester(null);
  };

  const getSemesterDisplayName = (semester: string) => {
    const match = semester.match(/(fa|sp)(\d{4})/);
    if (!match) return semester;

    const [, semesterType, year] = match;
    const seasonName = semesterType === "fa" ? "Fall" : "Spring";
    return `${seasonName} ${year}`;
  };

  const getSemesterStatusColor = (status: string) => {
    switch (status) {
      case "past":
        return "bg-gray-50 border-gray-300";
      case "current":
        return "bg-yellow-50 border-yellow-300";
      case "future":
        return "bg-slate-50 border-slate-300";
      default:
        return "bg-gray-50 border-gray-300";
    }
  };

  const shouldShowCourse = (course: Course) => {
    if (!courseSearchQuery.trim()) return true;

    const query = courseSearchQuery.toLowerCase();
    return (
      course.course_id.toLowerCase().includes(query) ||
      course.department.toLowerCase().includes(query) ||
      course.number.toLowerCase().includes(query) ||
      course.title.toLowerCase().includes(query)
    );
  };

  const getCourseStatusColor = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-100 border border-green-300 text-green-800";
      case "in_progress":
        return "bg-yellow-100 border border-yellow-300 text-yellow-800";
      case "planned":
      default:
        return "bg-blue-100 border border-blue-300 text-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading student plan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">Error: {error}</div>
        <button
          onClick={fetchStudent}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center p-8">
        <div className="text-lg text-gray-600">Student not found</div>
      </div>
    );
  }

  // Get the next semester after the given semester
  const getNextSemester = (semester: string) => {
    const match = semester.match(/(fa|sp)(\d{4})/);
    if (!match) return null;

    const [, semesterType, yearStr] = match;
    const year = parseInt(yearStr);

    if (semesterType === "fa") {
      return `sp${year + 1}`;
    } else {
      return `fa${year}`;
    }
  };

  // Find the next semester that should be added
  const getNextAvailableSemester = () => {
    if (!isClient) return null;

    const existingSemesters = Object.keys(student.plan);
    if (existingSemesters.length === 0) {
      // If no semesters exist, start with current semester
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (currentMonth >= 8) {
        return `fa${currentYear}`;
      } else if (currentMonth >= 1 && currentMonth <= 5) {
        return `sp${currentYear}`;
      } else {
        return `fa${currentYear}`;
      }
    }

    // Find the latest semester
    const sortedSemesters = existingSemesters.sort((a, b) => {
      const aMatch = a.match(/(fa|sp)(\d{4})/);
      const bMatch = b.match(/(fa|sp)(\d{4})/);
      if (!aMatch || !bMatch) return 0;
      const aYear = parseInt(aMatch[2]);
      const bYear = parseInt(bMatch[2]);
      if (aYear !== bYear) return bYear - aYear; // Reverse sort for latest first
      if (aMatch[1] === "fa" && bMatch[1] === "sp") return -1;
      if (aMatch[1] === "sp" && bMatch[1] === "fa") return 1;
      return 0;
    });

    const latestSemester = sortedSemesters[0];
    return getNextSemester(latestSemester);
  };

  // Add a new semester
  const addNewSemester = () => {
    const nextSemester = getNextAvailableSemester();
    if (!nextSemester) return;

    const semesterStatus = getSemesterStatus(nextSemester);

    // Create new semester in student plan
    const updatedStudent: Student = {
      ...student,
      plan: {
        ...student.plan,
        [nextSemester]: {
          courses: [],
          semesterCredits: 0,
          semesterStatus: semesterStatus,
        } as SemesterData,
      },
    };

    setStudent(updatedStudent);
  };

  // Delete an empty semester
  const deleteSemester = (semesterToDelete: string) => {
    const semesterData = student.plan[semesterToDelete];

    // Only allow deletion of empty semesters
    if (!semesterData || semesterData.courses.length > 0) {
      alert("Cannot delete semesters that contain courses");
      return;
    }

    // Don't allow deletion of gap semesters
    if (semesterData.isGapSemester) {
      alert("Cannot delete gap semesters");
      return;
    }

    // Create updated student without the deleted semester
    const { [semesterToDelete]: deletedSemester, ...remainingPlan } =
      student.plan;
    const updatedStudent: Student = {
      ...student,
      plan: remainingPlan,
    };

    setStudent(updatedStudent);
  };

  // Check if a semester can be deleted
  const canDeleteSemester = (semester: string) => {
    const semesterData = student.plan[semester];
    return (
      semesterData &&
      semesterData.courses.length === 0 &&
      !semesterData.isGapSemester &&
      semesterData.semesterStatus === "future"
    );
  };

  // Helper function to determine semester status
  const getSemesterStatus = (
    semester: string
  ): "past" | "current" | "future" => {
    if (!isClient) return "future"; // Default to future for SSR

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const semesterMatch = semester.match(/(fa|sp)(\d{4})/);
    if (!semesterMatch) return "future";

    const [, semesterType, yearStr] = semesterMatch;
    const year = parseInt(yearStr);

    if (year < currentYear) return "past";
    if (year > currentYear) return "future";

    // Same year - check semester
    if (semesterType === "sp") {
      return currentMonth <= 5 ? "current" : "past";
    } else {
      return currentMonth >= 8 ? "current" : "future";
    }
  };

  // Just use existing semesters, sorted chronologically
  const semesters = Object.keys(student.plan).sort((a, b) => {
    const aMatch = a.match(/(fa|sp)(\d{4})/);
    const bMatch = b.match(/(fa|sp)(\d{4})/);

    if (!aMatch || !bMatch) return 0;

    const aYear = parseInt(aMatch[2]);
    const bYear = parseInt(bMatch[2]);

    if (aYear !== bYear) return aYear - bYear;

    // Same year - spring comes before fall
    if (aMatch[1] === "sp" && bMatch[1] === "fa") return -1;
    if (aMatch[1] === "fa" && bMatch[1] === "sp") return 1;

    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Student Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-600 mt-1">{student.email}</p>
            <p className="text-sm text-gray-500">
              Expected Graduation: {student.expectedGraduation}
            </p>
          </div>

          {/* Course Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {courseSearchQuery && (
                <button
                  onClick={() => setCourseSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  title="Clear search"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {student.totalCredits} Credits
            </div>
            <div className="text-sm text-gray-600">
              <span className="text-green-600">
                {student.completedCredits} completed
              </span>{" "}
              •
              <span className="text-yellow-600 ml-1">
                {student.inProgressCredits} in progress
              </span>{" "}
              •
              <span className="text-blue-600 ml-1">
                {student.plannedCredits} planned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {semesters.map((semester) => {
          const semesterData = student.plan[semester];
          const canEdit =
            semesterData.semesterStatus === "future" ||
            semesterData.semesterStatus === "current";

          // Handle gap semesters with special styling
          if (semesterData.isGapSemester) {
            return (
              <div
                key={semester}
                className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4"
              >
                {/* Gap Semester Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-700">
                      {getSemesterDisplayName(semester)}
                      <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                        GAP
                      </span>
                    </h3>
                    <p className="text-sm text-orange-600">
                      {semesterData.gapReason || "Gap semester"}
                    </p>
                  </div>
                </div>

                {/* Gap Semester Content */}
                <div className="text-center py-8">
                  <div className="text-orange-400 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-orange-600 mb-2">Gap semester</p>
                  <p className="text-xs text-orange-500">
                    {semesterData.gapReason || "No specific reason provided"}
                  </p>
                </div>
              </div>
            );
          }

          // Handle regular semesters
          return (
            <div
              key={semester}
              className={`rounded-lg border-2 p-4 ${getSemesterStatusColor(
                semesterData.semesterStatus
              )}`}
            >
              {/* Semester Header */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getSemesterDisplayName(semester)}
                    {semesterData.semesterStatus === "current" && (
                      <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                        IN PROGRESS
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {semesterData.semesterCredits} credits
                  </p>
                </div>
                <div className="flex space-x-1">
                  {canEdit && (
                    <button
                      onClick={() => setAddingToSemester(semester)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Add Course"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                  {canDeleteSemester(semester) && (
                    <button
                      onClick={() => deleteSemester(semester)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Delete Empty Semester"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Courses */}
              <div className="space-y-2">
                {courseSearchQuery &&
                  semesterData.courses.filter(shouldShowCourse).length === 0 &&
                  semesterData.courses.length > 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No courses match your search
                    </div>
                  )}
                {semesterData.courses.filter(shouldShowCourse).map((course) => (
                  <div
                    key={course.course_id}
                    className={`p-3 rounded-md ${getCourseStatusColor(
                      course.status
                    )}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {course.department} {course.number}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {course.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {course.credits} credits • {course.status}
                        </div>
                      </div>
                      {canEdit && course.status === "planned" && (
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() =>
                              setEditingCourse({
                                semester,
                                courseId: course.course_id,
                              })
                            }
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit Course"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() =>
                              removeCourse(semester, course.course_id)
                            }
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Remove Course"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty semester message */}
                {semesterData.courses.length === 0 && !courseSearchQuery && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <svg
                        className="w-8 h-8 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      {canEdit
                        ? "No courses planned. Click + to add courses."
                        : "No courses scheduled"}
                    </p>
                  </div>
                )}

                {/* Add Course Form */}
                {addingToSemester === semester && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Course ID (e.g., CS101)"
                        value={newCourse.course_id}
                        onChange={(e) =>
                          setNewCourse({
                            ...newCourse,
                            course_id: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Department (e.g., CS)"
                        value={newCourse.department}
                        onChange={(e) =>
                          setNewCourse({
                            ...newCourse,
                            department: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Course Number (e.g., 101)"
                        value={newCourse.number}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, number: e.target.value })
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Course Title"
                        value={newCourse.title}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, title: e.target.value })
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Credits"
                        value={newCourse.credits}
                        onChange={(e) =>
                          setNewCourse({
                            ...newCourse,
                            credits: parseInt(e.target.value) || 3,
                          })
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        min="1"
                        max="6"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAddCourse(semester)}
                          className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          <Save size={14} className="inline mr-1" />
                          Add
                        </button>
                        <button
                          onClick={() => setAddingToSemester(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Semester Button */}
        {isClient && getNextAvailableSemester() && (
          <div className="flex items-center justify-center">
            <button
              onClick={addNewSemester}
              className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              title={`Add ${getSemesterDisplayName(
                getNextAvailableSemester() || ""
              )}`}
            >
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <Plus className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  Add {getSemesterDisplayName(getNextAvailableSemester() || "")}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">Edit Course</h3>
            {(() => {
              const course = student.plan[editingCourse.semester]?.courses.find(
                (c) => c.course_id === editingCourse.courseId
              );
              if (!course) return null;

              return (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Course ID"
                    defaultValue={course.course_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    id="edit-course-id"
                  />
                  <input
                    type="text"
                    placeholder="Department"
                    defaultValue={course.department}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    id="edit-department"
                  />
                  <input
                    type="text"
                    placeholder="Course Number"
                    defaultValue={course.number}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    id="edit-number"
                  />
                  <input
                    type="text"
                    placeholder="Course Title"
                    defaultValue={course.title}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    id="edit-title"
                  />
                  <input
                    type="number"
                    placeholder="Credits"
                    defaultValue={course.credits}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    min="1"
                    max="6"
                    id="edit-credits"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        const courseIdInput = document.getElementById(
                          "edit-course-id"
                        ) as HTMLInputElement;
                        const departmentInput = document.getElementById(
                          "edit-department"
                        ) as HTMLInputElement;
                        const numberInput = document.getElementById(
                          "edit-number"
                        ) as HTMLInputElement;
                        const titleInput = document.getElementById(
                          "edit-title"
                        ) as HTMLInputElement;
                        const creditsInput = document.getElementById(
                          "edit-credits"
                        ) as HTMLInputElement;

                        await updateCourse(
                          editingCourse.semester,
                          editingCourse.courseId,
                          {
                            course_id: courseIdInput.value,
                            department: departmentInput.value,
                            number: numberInput.value,
                            title: titleInput.value,
                            credits: parseInt(creditsInput.value),
                          }
                        );
                        setEditingCourse(null);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingCourse(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FourYearPlan;
