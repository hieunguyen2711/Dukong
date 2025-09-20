import { sendBulkMeetingRequests } from "../../utils/emailAlerts";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { advisorName = "Your Academic Advisor" } = req.body;

    if (!advisorName) {
      return res.status(400).json({
        message: "Missing required field: advisorName",
      });
    }

    // Load students data
    const studentsPath = path.join(
      process.cwd(),
      "app",
      "data",
      "students.json"
    );
    const studentsData = JSON.parse(fs.readFileSync(studentsPath, "utf8"));

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res.status(404).json({
        message: "No students data found",
      });
    }

    // Send bulk meeting requests
    const result = await sendBulkMeetingRequests(studentsData, advisorName);

    console.log(`Bulk meeting request operation completed:`, {
      sentCount: result.sentCount,
      errorCount: result.errorCount,
      totalAtRisk: result.totalAtRisk,
      advisorName: advisorName,
    });

    res.status(200).json({
      message: result.success
        ? "Meeting requests sent to students successfully"
        : "Meeting requests completed with some errors",
      ...result,
      advisorName: advisorName,
    });
  } catch (error) {
    console.error("Error in bulk alert operation:", error);

    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
