// Test script to verify API endpoints work correctly
// Run this after starting the development server with: npm run dev

const BASE_URL = "http://localhost:3000";

async function testAPI() {
  console.log("🧪 Testing Student Academic Planning System APIs...\n");

  try {
    // Test 1: Get student data
    console.log("1️⃣ Testing GET /api/student/[id]");
    const studentResponse = await fetch(`${BASE_URL}/api/student/S001`);
    if (studentResponse.ok) {
      const student = await studentResponse.json();
      console.log(`✅ Successfully fetched student: ${student.name}`);
      console.log(
        `   Total Credits: ${student.totalCredits}, Completed: ${student.completedCredits}`
      );
    } else {
      console.log("❌ Failed to fetch student data");
    }

    // Test 2: Add a course
    console.log("\n2️⃣ Testing POST /api/addCourse");
    const addResponse = await fetch(`${BASE_URL}/api/addCourse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "S001",
        semester: "sp2027",
        course: {
          course_id: "TEST101",
          department: "TEST",
          number: "101",
          title: "Test Course",
          credits: 3,
        },
      }),
    });

    if (addResponse.ok) {
      const updatedStudent = await addResponse.json();
      console.log("✅ Successfully added test course");
      console.log(`   New total credits: ${updatedStudent.totalCredits}`);
    } else {
      const error = await addResponse.json();
      console.log(`❌ Failed to add course: ${error.message}`);
    }

    // Test 3: Remove the course we just added
    console.log("\n3️⃣ Testing POST /api/removeCourse");
    const removeResponse = await fetch(`${BASE_URL}/api/removeCourse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "S001",
        semester: "sp2027",
        courseId: "TEST101",
      }),
    });

    if (removeResponse.ok) {
      const updatedStudent = await removeResponse.json();
      console.log("✅ Successfully removed test course");
      console.log(`   Credits back to: ${updatedStudent.totalCredits}`);
    } else {
      const error = await removeResponse.json();
      console.log(`❌ Failed to remove course: ${error.message}`);
    }

    console.log("\n🎉 API testing completed!");
    console.log("\n📖 Next steps:");
    console.log("   • Open http://localhost:3000 to view the dashboard");
    console.log("   • Click on any student to view their four-year plan");
    console.log("   • Try adding/removing courses in future semesters");
  } catch (error) {
    console.log("❌ Error during testing:", error.message);
    console.log("\n💡 Make sure the development server is running:");
    console.log("   npm run dev");
  }
}

// Run the test
testAPI();
