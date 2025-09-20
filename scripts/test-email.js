// Test script for SendGrid email integration
const sgMail = require("@sendgrid/mail");

// Load environment variables (if running standalone)
require("dotenv").config({ path: ".env.local" });

// Set SendGrid API key
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error("SENDGRID_API_KEY environment variable is not set");
  console.error("   Please check your .env.local file");
  process.exit(1);
}
sgMail.setApiKey(apiKey);

// Test student data
const testStudent = {
  id: "S001",
  name: "Test Student",
  email: "test.student@college.edu",
  expectedGraduation: "sp2026",
  completedCredits: 18,
  inProgressCredits: 3,
  plannedCredits: 3,
  totalCredits: 24,
};

const testEmail = async () => {
  try {
    console.log("Testing SendGrid Email Integration...\n");

    // Calculate risk details
    const creditsCompleted = testStudent.completedCredits || 0;
    const creditsInProgress = testStudent.inProgressCredits || 0;
    const creditsNeeded = 120 - (creditsCompleted + creditsInProgress);
    const progressPercent = Math.round(
      ((creditsCompleted + creditsInProgress) / 120) * 100
    );

    console.log("📊 Student Risk Assessment:");
    console.log(`   Name: ${testStudent.name}`);
    console.log(`   Progress: ${progressPercent}%`);
    console.log(`   Credits Needed: ${creditsNeeded}`);
    console.log(`   Expected Graduation: ${testStudent.expectedGraduation}\n`);

    const subject = `📚 Test: Meeting Request from Your Academic Advisor`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ TEST Academic Risk Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">This is a test email</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Test Student Information</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Name:</strong> ${testStudent.name}</p>
            <p><strong>Email:</strong> ${testStudent.email}</p>
            <p><strong>Student ID:</strong> ${testStudent.id}</p>
            <p><strong>Expected Graduation:</strong> ${
              testStudent.expectedGraduation
            }</p>
          </div>

          <h3 style="color: #dc2626;">⚠️ Risk Assessment</h3>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Academic Progress:</strong></span>
              <span style="color: #dc2626; font-weight: bold;">${progressPercent}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Credits Completed:</span>
              <span style="color: #059669;">${creditsCompleted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Credits In Progress:</span>
              <span style="color: #d97706;">${creditsInProgress}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Credits Still Needed:</span>
              <span style="color: #dc2626; font-weight: bold;">${creditsNeeded}</span>
            </div>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p><strong>✅ This was a test email from the Academic Advisor Dashboard.</strong></p>
            <p>Generated on: ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
🚨 TEST ACADEMIC RISK ALERT 🚨

Student: ${testStudent.name}
Email: ${testStudent.email}
Student ID: ${testStudent.id}
Expected Graduation: ${testStudent.expectedGraduation}

RISK ASSESSMENT:
- Academic Progress: ${progressPercent}%
- Credits Completed: ${creditsCompleted}
- Credits In Progress: ${creditsInProgress}
- Credits Still Needed: ${creditsNeeded}

✅ This was a test email from the Academic Advisor Dashboard.
Generated on: ${new Date().toLocaleDateString()}
    `.trim();

    // Email configuration
    const msg = {
      to: "zakariatimalma@gmail.com", // Replace with YOUR email to test
      from: {
        email: "zakariatimalma@outlook.com", // Your verified SendGrid sender email
        name: "Test Academic Advisor",
      },
      subject: subject,
      text: textContent,
      html: htmlContent,
      categories: ["academic-alert", "test"],
      customArgs: {
        student_id: testStudent.id,
        alert_type: "test",
        timestamp: new Date().toISOString(),
      },
    };

    console.log("📧 Sending test email...");
    console.log(`   To: ${msg.to}`);
    console.log(`   From: ${msg.from.email}`);
    console.log(`   Subject: ${msg.subject}\n`);

    // Send the email
    await sgMail.send(msg);

    console.log("✅ Test email sent successfully!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Check your email inbox");
    console.log("   2. Verify the email formatting looks correct");
    console.log('   3. Update the "from" email to your verified sender domain');
    console.log('   4. Update the "to" email for actual alerts');
  } catch (error) {
    console.error(" Error sending test email:", error);

    if (error.response) {
      console.error("\n🔍 SendGrid Error Details:");
      console.error("   Status:", error.code);
      console.error("   Message:", error.message);
      console.error("   Response:", error.response.body);
    }

    console.log("\n🛠️ Troubleshooting:");
    console.log("   1. Verify SENDGRID_API_KEY is set correctly");
    console.log("   2. Make sure your SendGrid sender email is verified");
    console.log("   3. Check SendGrid dashboard for any issues");
  }
};

// Run the test
testEmail();
