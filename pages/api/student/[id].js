import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    // Read the students.json file
    const studentsPath = path.join(
      process.cwd(),
      "app",
      "data",
      "students.json"
    );
    const studentsData = JSON.parse(fs.readFileSync(studentsPath, "utf8"));

    // Find the student by ID
    const student = studentsData.find((s) => s.id === id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
