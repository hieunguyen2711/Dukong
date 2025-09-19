import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { studentId, semester, courseId } = req.body;

    // Validate required fields
    if (!studentId || !semester || !courseId) {
      return res.status(400).json({
        message: "Missing required fields: studentId, semester, courseId",
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

    // Check if semester exists
    if (!student.plan[semester]) {
      return res
        .status(404)
        .json({ message: "Semester not found in student plan" });
    }

    // Find the course in the semester
    const courseIndex = student.plan[semester].courses.findIndex(
      (c) => c.course_id === courseId
    );
    if (courseIndex === -1) {
      return res
        .status(404)
        .json({ message: "Course not found in this semester" });
    }

    // Check if the course can be removed (only planned courses can be removed)
    const courseToRemove = student.plan[semester].courses[courseIndex];
    if (courseToRemove.status === "taken") {
      return res
        .status(400)
        .json({ message: "Cannot remove completed courses" });
    }

    // Remove the course
    student.plan[semester].courses.splice(courseIndex, 1);

    // Recalculate semester credits
    student.plan[semester].semesterCredits = student.plan[
      semester
    ].courses.reduce((sum, c) => sum + c.credits, 0);

    // If semester has no courses, remove it
    if (student.plan[semester].courses.length === 0) {
      delete student.plan[semester];
    }

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
    console.error("Error removing course:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
