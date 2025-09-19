"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Plus, Edit3, Save, X, Search } from "lucide-react";

interface Course {
  course_id: string;
  department: string;
  number: string;
  title: string;
  credits: number;
  status: "taken" | "planned";
}

interface SemesterData {
  courses: Course[];
  semesterCredits: number;
  semesterStatus: "past" | "current" | "future";
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

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

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
        return "bg-gray-100 border-gray-300";
      case "current":
        return "bg-blue-50 border-blue-300";
      case "future":
        return "bg-green-50 border-green-300";
      default:
        return "bg-gray-100 border-gray-300";
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
    return status === "taken"
      ? "bg-gray-200 text-gray-800"
      : "bg-white border border-gray-300";
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
                  </h3>
                  <p className="text-sm text-gray-600">
                    {semesterData.semesterCredits} credits
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setAddingToSemester(semester)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    title="Add Course"
                  >
                    <Plus size={20} />
                  </button>
                )}
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
