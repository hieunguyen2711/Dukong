import fs from "fs";
import path from "path";
import { validateCourseSelection } from "../../utils/courseOffering.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { studentId, semester, course } = req.body;

    // Validate required fields
    if (!studentId || !semester || !course) {
      return res.status(400).json({
        message: "Missing required fields: studentId, semester, course",
      });
    }

    // Validate course object
    if (!course.course_id || !course.title || !course.credits) {
      return res.status(400).json({
        message: "Invalid course object. Required: course_id, title, credits",
      });
    }

    // Read the students.json file
    const studentsPath = path.join(
      process.cwd(),
      "app",
      "data",
      "students.json"
    );
    const studentsData = JSON.parse(fs.readFileSync(studentsPath, "utf8"));

    // Find the student
    const studentIndex = studentsData.findIndex((s) => s.id === studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentsData[studentIndex];

    // Initialize semester if it doesn't exist
    if (!student.plan[semester]) {
      student.plan[semester] = {
        courses: [],
        semesterCredits: 0,
        semesterStatus: getSemesterStatus(semester),
      };
    }

    // Check if course already exists in this semester
    const existingCourse = student.plan[semester].courses.find(
      (c) => c.course_id === course.course_id
    );
    if (existingCourse) {
      return res
        .status(400)
        .json({ message: "Course already exists in this semester" });
    }

    // Validate course offering for future semesters
    const semesterStatus = getSemesterStatus(semester);
    if (semesterStatus === "future") {
      const semesterMatch = semester.match(/(fa|sp)(\d{4})/);
      if (semesterMatch) {
        const [, semesterType, yearStr] = semesterMatch;
        const year = parseInt(yearStr);
        const semesterName = semesterType === "fa" ? "Fall" : "Spring";

        const validation = validateCourseSelection(course.course_id, semesterName, year);
        if (!validation.valid) {
          return res.status(400).json({
            message: validation.message,
            type: "offering_validation_error"
          });
        }
      }
    }

    // Add the course with proper status
    const newCourse = {
      course_id: course.course_id,
      department: course.department || "",
      number: course.number || "",
      title: course.title,
      credits: parseInt(course.credits),
      status: course.status || "planned",
    };

    student.plan[semester].courses.push(newCourse);

    // Recalculate semester credits
    student.plan[semester].semesterCredits = student.plan[
      semester
    ].courses.reduce((sum, c) => sum + c.credits, 0);

    // Recalculate total credits
    let totalCredits = 0;
    let completedCredits = 0;
    let plannedCredits = 0;

    Object.values(student.plan).forEach((semesterData) => {
      semesterData.courses.forEach((c) => {
        totalCredits += c.credits;
        if (c.status === "taken") {
          completedCredits += c.credits;
        } else {
          plannedCredits += c.credits;
        }
      });
    });

    student.totalCredits = totalCredits;
    student.completedCredits = completedCredits;
    student.plannedCredits = plannedCredits;

    // Save back to file
    fs.writeFileSync(studentsPath, JSON.stringify(studentsData, null, 2));

    res.status(200).json(student);
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Helper function to determine semester status
function getSemesterStatus(semester) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const semesterMatch = semester.match(/(fa|sp)(\d{4})/);
  if (!semesterMatch) return "unknown";

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
}
