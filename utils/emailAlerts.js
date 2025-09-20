// Utility functions for email alerts

// Sophisticated "At Risk" Logic (matches the one in app/page.tsx)
export const isStudentAtRisk = (student) => {
  const CREDITS_NEEDED = 120;
  const MAX_CREDITS_PER_SEMESTER = 15;
  const TYPICAL_CREDITS_PER_SEMESTER = 12;

  // Parse graduation term
  let gradMatch = student.expectedGraduation.match(/(Spring|Fall)\s+(\d{4})/);

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
  const currentMonth = now.getMonth() + 1;
  const isSpring = currentMonth <= 7;

  // Calculate semesters remaining
  let semestersRemaining = 0;

  if (gradYear > currentYear) {
    const yearsRemaining = gradYear - currentYear;
    semestersRemaining = yearsRemaining * 2;

    if (isSpring && gradSemester === "Spring") {
      semestersRemaining -= 1;
    } else if (!isSpring && gradSemester === "Fall") {
      semestersRemaining += 0;
    } else if (isSpring && gradSemester === "Fall") {
      semestersRemaining -= 0.5;
    } else {
      semestersRemaining -= 1.5;
    }
  } else if (gradYear === currentYear) {
    if (gradSemester === "Spring" && isSpring) {
      semestersRemaining = 1;
    } else if (gradSemester === "Fall" && !isSpring) {
      semestersRemaining = 1;
    } else if (gradSemester === "Fall" && isSpring) {
      semestersRemaining = 1;
    } else {
      semestersRemaining = 0;
    }
  } else {
    return true;
  }

  semestersRemaining = Math.max(0, semestersRemaining);

  const creditsCompleted = student.completedCredits || 0;
  const creditsInProgress = student.inProgressCredits || 0;
  const totalCreditsEarnedOrInProgress = creditsCompleted + creditsInProgress;
  const creditsStillNeeded = Math.max(
    0,
    CREDITS_NEEDED - totalCreditsEarnedOrInProgress
  );

  // Risk assessment scenarios
  if (semestersRemaining <= 0 && creditsStillNeeded > 0) {
    return true;
  }

  if (semestersRemaining <= 0) {
    return false;
  }

  const maxPossibleCredits = semestersRemaining * MAX_CREDITS_PER_SEMESTER;
  const typicalPossibleCredits =
    semestersRemaining * TYPICAL_CREDITS_PER_SEMESTER;

  if (creditsStillNeeded > maxPossibleCredits) {
    return true;
  }

  if (creditsStillNeeded > typicalPossibleCredits) {
    return true;
  }

  if (
    semestersRemaining <= 1 &&
    creditsStillNeeded > MAX_CREDITS_PER_SEMESTER * 0.8
  ) {
    return true;
  }

  if (semestersRemaining >= 4) {
    const expectedCreditsAtThisPoint =
      (8 - semestersRemaining) * TYPICAL_CREDITS_PER_SEMESTER;
    if (totalCreditsEarnedOrInProgress < expectedCreditsAtThisPoint * 0.7) {
      return true;
    }
  }

  return false;
};

// Send meeting request to a single student
export const sendStudentMeetingRequest = async (
  student,
  advisorName = "Your Academic Advisor",
  alertType = "meeting_request"
) => {
  try {
    const response = await fetch("/api/send-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student,
        advisorName,
        alertType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send meeting request");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending meeting request:", error);
    throw error;
  }
};

// Send meeting requests to all at-risk students
export const sendBulkMeetingRequests = async (
  students,
  advisorName = "Your Academic Advisor"
) => {
  const atRiskStudents = students.filter((student) => isStudentAtRisk(student));

  if (atRiskStudents.length === 0) {
    return {
      success: true,
      message: "No at-risk students found",
      sentCount: 0,
      totalStudents: students.length,
    };
  }

  const results = [];
  const errors = [];

  // Send meeting requests with a small delay to avoid rate limiting
  for (const student of atRiskStudents) {
    try {
      const result = await sendStudentMeetingRequest(
        student,
        advisorName,
        "meeting_request"
      );
      results.push(result);

      // Small delay to be respectful to SendGrid API
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      errors.push({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        error: error.message,
      });
    }
  }

  return {
    success: errors.length === 0,
    sentCount: results.length,
    errorCount: errors.length,
    totalAtRisk: atRiskStudents.length,
    totalStudents: students.length,
    errors: errors,
    results: results,
  };
};

// Get risk level description
export const getRiskLevel = (student) => {
  if (!isStudentAtRisk(student)) {
    return { level: "low", description: "On Track", color: "green" };
  }

  const creditsCompleted = student.completedCredits || 0;
  const creditsInProgress = student.inProgressCredits || 0;
  const totalCredits = creditsCompleted + creditsInProgress;
  const progressPercent = (totalCredits / 120) * 100;

  // Parse graduation to determine urgency
  const gradMatch = student.expectedGraduation.match(/(sp|fa)(\d{4})/);
  const currentYear = new Date().getFullYear();
  const gradYear = gradMatch ? parseInt(gradMatch[2]) : currentYear + 4;
  const yearsRemaining = gradYear - currentYear;

  if (yearsRemaining <= 0 || (yearsRemaining <= 1 && progressPercent < 75)) {
    return { level: "critical", description: "Critical Risk", color: "red" };
  } else if (yearsRemaining <= 1 || progressPercent < 50) {
    return { level: "high", description: "High Risk", color: "orange" };
  } else {
    return { level: "moderate", description: "Moderate Risk", color: "yellow" };
  }
};
