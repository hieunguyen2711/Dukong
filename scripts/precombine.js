const fs = require("fs");
const path = require("path");

// Helper function to parse CSV with proper handling of quoted values
function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values properly
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === "'" && !inQuotes) {
        inQuotes = true;
      } else if (char === "'" && inQuotes) {
        inQuotes = false;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

// Helper function to extract year from graduation date
function extractGradYear(gradDate) {
  // Format: "fa2026" or "sp2027"
  const match = gradDate.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

// Helper function to determine if a semester is in the past, current, or future
function getSemesterStatus(semester) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-based to 1-based

  const semesterMatch = semester.match(/(fa|sp)(\d{4})/);
  if (!semesterMatch) return "unknown";

  const [, semesterType, yearStr] = semesterMatch;
  const year = parseInt(yearStr);

  if (year < currentYear) return "past";
  if (year > currentYear) return "future";

  // Same year - check semester
  if (semesterType === "sp") {
    // Spring semester (January-May)
    return currentMonth <= 5 ? "current" : "past";
  } else {
    // Fall semester (August-December)
    return currentMonth >= 8 ? "current" : "future";
  }
}

async function precombineData() {
  try {
    console.log("Starting data precombination...");

    // Read all CSV files
    const dataDir = path.join(__dirname, "../app/data");

    const studentData = parseCSV(
      fs.readFileSync(path.join(dataDir, "student.csv"), "utf8")
    );
    const courseData = parseCSV(
      fs.readFileSync(path.join(dataDir, "course.csv"), "utf8")
    );
    const sectionData = parseCSV(
      fs.readFileSync(path.join(dataDir, "section.csv"), "utf8")
    );
    const enrollmentData = parseCSV(
      fs.readFileSync(path.join(dataDir, "enrollment.csv"), "utf8")
    );
    const plannedData = parseCSV(
      fs.readFileSync(path.join(dataDir, "planned.csv"), "utf8")
    );
    const offeringData = parseCSV(
      fs.readFileSync(path.join(dataDir, "offering.csv"), "utf8")
    );

    console.log(
      `Loaded ${studentData.length} students, ${courseData.length} courses, ${sectionData.length} sections`
    );
    console.log(
      `Loaded ${enrollmentData.length} enrollments, ${plannedData.length} planned courses`
    );

    // Create course lookup maps
    const courseMap = {};
    courseData.forEach((course) => {
      courseMap[course["crs id"]] = {
        id: course["crs id"],
        department: course["dept code"],
        number: course["crs num"],
        title: course["title"],
        minCredits: parseInt(course["min hours"]),
        maxCredits: parseInt(course["max hours"]),
        credits: parseInt(course["max hours"]), // Use max hours as default credits
      };
    });

    // Create section lookup map
    const sectionMap = {};
    sectionData.forEach((section) => {
      sectionMap[section["sec id"]] = {
        sectionId: section["sec id"],
        department: section["dept code"],
        courseNumber: section["crs num"],
        sectionNumber: section["sec num"],
        semester: section["sem"],
      };
    });

    // Process students
    const students = [];

    studentData.forEach((student) => {
      const studentId = student["std id"];
      const gradDate = student["exp grad date"];
      const gradYear = extractGradYear(gradDate);

      // Initialize student object
      const studentObj = {
        id: studentId,
        name: student["name"],
        email: student["email"],
        gradYear: gradYear,
        expectedGraduation: gradDate,
        plan: {},
      };

      // Process enrollments (taken courses)
      const studentEnrollments = enrollmentData.filter(
        (enrollment) => enrollment["std id"] === studentId
      );
      studentEnrollments.forEach((enrollment) => {
        const section = sectionMap[enrollment["sec id"]];
        if (section) {
          const semester = section.semester;
          const courseKey = `${section.department}${section.courseNumber}`;

          // Find the course details
          const course = Object.values(courseMap).find(
            (c) =>
              c.department === section.department &&
              c.number === section.courseNumber
          );

          if (course) {
            if (!studentObj.plan[semester]) {
              studentObj.plan[semester] = [];
            }

            // Check if course already exists in this semester
            const existingCourse = studentObj.plan[semester].find(
              (c) => c.course_id === course.id
            );
            if (!existingCourse) {
              studentObj.plan[semester].push({
                course_id: course.id,
                department: course.department,
                number: course.number,
                title: course.title,
                credits: course.credits,
                status: "taken",
              });
            }
          }
        }
      });

      // Process planned courses (future courses)
      const studentPlanned = plannedData.filter(
        (planned) => planned["std id"] === studentId
      );
      studentPlanned.forEach((planned) => {
        const courseId = planned["crs id"];
        const semester = planned["sem"];
        const course = courseMap[courseId];

        if (course) {
          if (!studentObj.plan[semester]) {
            studentObj.plan[semester] = [];
          }

          // Check if course already exists in this semester
          const existingCourse = studentObj.plan[semester].find(
            (c) => c.course_id === course.id
          );
          if (!existingCourse) {
            studentObj.plan[semester].push({
              course_id: course.id,
              department: course.department,
              number: course.number,
              title: course.title,
              credits: course.credits,
              status: "planned",
            });
          }
        }
      });

      // Sort semesters chronologically
      const sortedPlan = {};
      const semesterOrder = Object.keys(studentObj.plan).sort((a, b) => {
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

      semesterOrder.forEach((semester) => {
        sortedPlan[semester] = studentObj.plan[semester];
      });

      studentObj.plan = sortedPlan;

      // Calculate total credits and add metadata
      let totalCredits = 0;
      let completedCredits = 0;
      let plannedCredits = 0;

      Object.keys(studentObj.plan).forEach((semester) => {
        let semesterCredits = 0;
        studentObj.plan[semester].forEach((course) => {
          totalCredits += course.credits;
          semesterCredits += course.credits;

          if (course.status === "taken") {
            completedCredits += course.credits;
          } else {
            plannedCredits += course.credits;
          }
        });

        // Add semester metadata
        studentObj.plan[semester] = {
          courses: studentObj.plan[semester],
          semesterCredits: semesterCredits,
          semesterStatus: getSemesterStatus(semester),
        };
      });

      studentObj.totalCredits = totalCredits;
      studentObj.completedCredits = completedCredits;
      studentObj.plannedCredits = plannedCredits;

      students.push(studentObj);
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "../app/data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the combined data
    const outputPath = path.join(outputDir, "students.json");
    fs.writeFileSync(outputPath, JSON.stringify(students, null, 2));

    console.log(
      `Successfully created ${outputPath} with ${students.length} students`
    );
    console.log("Sample student structure:");
    if (students.length > 0) {
      console.log(JSON.stringify(students[0], null, 2));
    }
  } catch (error) {
    console.error("Error during precombination:", error);
    process.exit(1);
  }
}

// Run the precombination
precombineData();
