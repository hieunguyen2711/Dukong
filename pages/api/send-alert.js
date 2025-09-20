const sgMail = require("@sendgrid/mail");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Check API key configuration at request time
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.error("SENDGRID_API_KEY environment variable is not set");
    return res.status(500).json({
      message: "Email service not configured",
      error: "SENDGRID_API_KEY environment variable is missing",
    });
  }

  if (!apiKey.startsWith("SG.")) {
    console.error(
      "Invalid SendGrid API key format. API key must start with 'SG.'"
    );
    return res.status(500).json({
      message: "Email service not configured",
      error: "Invalid SendGrid API key format",
    });
  }

  // Set the API key for this request
  sgMail.setApiKey(apiKey);

  try {
    const {
      student,
      advisorName = "Your Academic Advisor",
      alertType = "meeting_request",
    } = req.body;

    if (!student) {
      return res.status(400).json({
        message: "Missing required field: student",
      });
    }

    // Calculate risk details
    const creditsCompleted = student.completedCredits || 0;
    const creditsInProgress = student.inProgressCredits || 0;
    const creditsNeeded = 120 - (creditsCompleted + creditsInProgress);
    const progressPercent = Math.round(
      ((creditsCompleted + creditsInProgress) / 120) * 100
    );

    // Create email content based on alert type
    let subject, htmlContent, textContent;

    if (alertType === "meeting_request") {
      subject = `📚 Important: Meeting Request from ${advisorName}`;

      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📚 Academic Planning Meeting Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your advisor would like to meet with you</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${
              student.name
            }! 👋</h2>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              Your academic advisor, <strong>${advisorName}</strong>, would like to schedule a meeting with you to discuss your academic progress and help ensure you're on track for graduation.
            </p>

            <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">📊 Your Current Progress</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Academic Progress:</span>
                <span style="color: #0369a1; font-weight: bold;">${progressPercent}%</span>
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
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Expected Graduation:</span>
                <span style="font-weight: bold;">${
                  student.expectedGraduation
                }</span>
              </div>
            </div>

            <h3 style="color: #1f2937;">🎯 What We'll Discuss</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              <li><strong>Course Planning:</strong> Review your upcoming semester schedule</li>
              <li><strong>Graduation Timeline:</strong> Ensure you're on track to graduate on time</li>
              <li><strong>Academic Support:</strong> Discuss resources that can help you succeed</li>
              <li><strong>Career Preparation:</strong> Plan courses that align with your career goals</li>
              <li><strong>Questions & Concerns:</strong> Address any challenges you're facing</li>
            </ul>

            <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; text-align: center;">
              <h3 style="color: #92400e; margin-top: 0;">⏰ Next Steps</h3>
              <p style="margin: 10px 0; color: #92400e; font-size: 16px;">
                <strong>Please contact your advisor to schedule this meeting as soon as possible.</strong>
              </p>
              <p style="margin: 10px 0; color: #92400e;">
                📧 Email: ${advisorName
                  .toLowerCase()
                  .replace(/\s+/g, ".")}@college.edu<br>
                📞 Phone: (555) 123-4567<br>
                🏢 Office: Academic Success Center, Room 201
              </p>
            </div>

            <div style="margin-top: 20px; padding: 20px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;">
              <p style="margin: 0; color: #0369a1;">
                <strong>💡 View Your Academic Plan:</strong> 
                <a href="/student/${
                  student.id
                }" style="color: #0369a1; text-decoration: none;">
                  Check your detailed four-year plan →
                </a>
              </p>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p><strong>Remember:</strong> Regular meetings with your advisor help ensure academic success and timely graduation!</p>
              <p>This message was sent on: ${new Date().toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</p>
            </div>
          </div>
        </div>
      `;

      textContent = `
📚 ACADEMIC PLANNING MEETING REQUEST 📚

Hi ${student.name}!

Your academic advisor, ${advisorName}, would like to schedule a meeting with you to discuss your academic progress and help ensure you're on track for graduation.

YOUR CURRENT PROGRESS:
- Academic Progress: ${progressPercent}%
- Credits Completed: ${creditsCompleted}
- Credits In Progress: ${creditsInProgress}
- Credits Still Needed: ${creditsNeeded}
- Expected Graduation: ${student.expectedGraduation}

WHAT WE'LL DISCUSS:
1. Course Planning: Review your upcoming semester schedule
2. Graduation Timeline: Ensure you're on track to graduate on time
3. Academic Support: Discuss resources that can help you succeed
4. Career Preparation: Plan courses that align with your career goals
5. Questions & Concerns: Address any challenges you're facing

NEXT STEPS:
Please contact your advisor to schedule this meeting as soon as possible.

📧 Email: ${advisorName.toLowerCase().replace(/\s+/g, ".")}@college.edu
📞 Phone: (555) 123-4567
🏢 Office: Academic Success Center, Room 201

View your academic plan: /student/${student.id}

Remember: Regular meetings with your advisor help ensure academic success and timely graduation!

Sent on: ${new Date().toLocaleDateString()}
      `.trim();
    }

    // Email configuration - Send TO the student
    const msg = {
      to: student.email,
      from: {
        email: "zakariatimalma@outlook.com", // Your verified SendGrid sender email
        name: advisorName || "Academic Advisor",
      },
      subject: subject,
      text: textContent,
      html: htmlContent,
      // Add categories for tracking
      categories: ["student-notification", alertType],
      // Custom headers for tracking
      customArgs: {
        student_id: student.id,
        advisor_name: advisorName,
        alert_type: alertType,
        timestamp: new Date().toISOString(),
      },
    };

    // Send the email
    await sgMail.send(msg);

    console.log(
      `Meeting request sent successfully to student ${student.id} (${student.email}) from ${advisorName}`
    );

    res.status(200).json({
      message: "Meeting request sent to student successfully",
      studentId: student.id,
      studentEmail: student.email,
      advisorName: advisorName,
      alertType: alertType,
    });
  } catch (error) {
    console.error("Error sending alert email:", error);

    // Handle SendGrid specific errors
    if (error.response) {
      console.error("SendGrid Error Response:", error.response.body);
      return res.status(error.code || 500).json({
        message: "Failed to send email",
        error: error.response.body.errors || error.message,
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
