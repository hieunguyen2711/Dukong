# Student Academic Planning System

A comprehensive Next.js application for academic advisors to manage and visualize student four-year plans. This system allows advisors to view student progress, add/remove courses, and track academic milestones.

## Features

### ✅ Completed Features

- **CSV Data Processing**: Converts CSV files into a unified JSON format
- **Student Dashboard**: Overview of all students with progress indicators
- **Four-Year Plan Visualization**: Interactive semester-by-semester course planning
- **Course Management**: Add, remove, and update planned courses
- **Academic Progress Tracking**: Real-time credit calculations and completion status
- **Intelligent At-Risk Detection**: Sophisticated algorithm identifies students at risk of not graduating on time
- **SendGrid Email Integration**: Professional email alerts for at-risk students and meeting requests
- **Course Offering Validation**: Ensures courses are available in selected semesters using offering patterns
- **Responsive Design**: Modern UI with Tailwind CSS and Lucide icons
- **Advanced Sorting & Filtering**: Multi-criteria search and sort functionality

### 🎯 Core Functionality

1. **Data Conversion**: `scripts/precombine.js` merges CSV files into `students.json`
2. **API Routes**: RESTful endpoints for student data management
3. **Interactive UI**: React components for viewing and editing academic plans
4. **Real-time Updates**: Automatic recalculation of credits and progress
5. **Email Alerts**: SendGrid integration for automated student communications
6. **Risk Assessment**: Mathematical analysis of graduation timeline feasibility

## Project Structure

```
Dukong/
├── app/
│   ├── data/                    # CSV source files and generated JSON
│   │   ├── student.csv          # Student information
│   │   ├── course.csv           # Course catalog
│   │   ├── section.csv          # Course sections by semester
│   │   ├── enrollment.csv       # Past/current enrollments
│   │   ├── planned.csv          # Future planned courses
│   │   ├── offering.csv         # Course offerings by semester
│   │   └── students.json        # Generated unified data
│   ├── student/[id]/page.tsx    # Individual student plan view
│   └── page.tsx                 # Main dashboard
├── components/
│   └── FourYearPlan.tsx         # Main planning component
├── pages/api/                   # API routes
│   ├── student/[id].js          # Get student data
│   ├── addCourse.js             # Add course to plan
│   ├── removeCourse.js          # Remove course from plan
│   └── updateCourse.js          # Update course details
├── scripts/
│   └── precombine.js            # CSV to JSON converter
└── public/
    └── students.json            # Public access to student data
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Dukong
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file and add your SendGrid API key:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your SendGrid API key:

   ```
   SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key_here
   ```

   **Get a SendGrid API Key:**
   - Sign up at [SendGrid](https://sendgrid.com)
   - Go to Settings > API Keys
   - Create a new API key with "Mail Send" permissions
   - The API key must start with "SG." for proper validation

4. **Generate student data from CSV files**

   ```bash
   node scripts/precombine.js
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## SendGrid Email Integration

### What it Does

The system includes a sophisticated email alert system powered by **SendGrid** that helps academic advisors proactively support students who are at risk of not graduating on time.

### Key Features

#### 🎯 **Intelligent At-Risk Detection**
The system uses a sophisticated algorithm to identify students who may be at risk of not graduating on time:

- **Credit Analysis**: Compares completed credits vs. time remaining
- **Semester Constraints**: Considers realistic course load limits (15 credits/semester max)
- **Timeline Assessment**: Evaluates if remaining credits can be completed by graduation date
- **Early Warning System**: Identifies problems before they become critical

#### 📧 **Professional Email Communications**
- **Rich HTML Emails**: Beautiful, professional email templates with student progress details
- **Personalized Content**: Each email includes the student's specific academic information
- **Progress Dashboard**: Visual representation of completed, in-progress, and planned credits
- **Action Items**: Clear next steps and advisor contact information

#### 🔄 **Automated Workflows**
- **Individual Alerts**: Send meeting requests to specific at-risk students
- **Bulk Communications**: Send alerts to all at-risk students simultaneously
- **Real-time Processing**: Instant email delivery with error handling and retry logic

### How the At-Risk Algorithm Works

The system evaluates multiple factors to determine if a student is at risk:

1. **Time Remaining Analysis**
   ```
   Semesters Remaining = (Graduation Year - Current Year) × 2
   ```

2. **Credit Feasibility Check**
   ```
   Credits Still Needed = 120 - (Completed + In Progress)
   Max Possible Credits = Semesters Remaining × 15
   ```

3. **Risk Categories**
   - **Critical Risk**: Impossible to complete even with maximum course load
   - **High Risk**: Requires more than typical course load (>12 credits/semester)
   - **Moderate Risk**: Behind expected progress for their timeline
   - **On Track**: Meeting or exceeding expected progress

### Email Content Features

Each automated email includes:

- **Student Progress Summary**: Current credit status and completion percentage
- **Graduation Timeline**: Expected graduation date and time remaining
- **Meeting Request**: Professional invitation to schedule an advising appointment
- **Contact Information**: Advisor details and office location
- **Direct Links**: Link to student's four-year plan for detailed review

### API Endpoints

#### `POST /api/send-alert`
Sends a meeting request email to a specific student.

**Request Body:**
```json
{
  "student": {
    "id": "S031",
    "name": "Timalma Zakaria",
    "email": "zakariatimalma@gmail.com",
    "completedCredits": 45,
    "inProgressCredits": 12,
    "expectedGraduation": "Spring 2026"
  },
  "advisorName": "Dr. Academic Advisor",
  "alertType": "meeting_request"
}
```

**Response:**
```json
{
  "message": "Meeting request sent to student successfully",
  "studentId": "S031",
  "studentEmail": "zakariatimalma@gmail.com",
  "advisorName": "Dr. Academic Advisor",
  "alertType": "meeting_request"
}
```

### Configuration Requirements

1. **SendGrid Account**: Free SendGrid account
2. **API Key**: SendGrid API key with "Mail Send" permissions
3. **Verified Sender**: Email address verified in SendGrid for sending
4. **Environment Variable**: `SENDGRID_API_KEY` properly configured

### Security Features

- **Environment Variables**: API keys stored securely, never committed to git
- **Input Validation**: All email data validated before processing
- **Error Handling**: Comprehensive error handling with detailed logging
- **Rate Limiting**: Built-in delays to respect SendGrid rate limits



## Data Structure

### CSV Files

The system processes the following CSV files:

- **student.csv**: Student ID, name, email, expected graduation
- **course.csv**: Course ID, department, number, title, credit hours
- **section.csv**: Course sections with semester information
- **enrollment.csv**: Past and current course enrollments
- **planned.csv**: Future planned courses by semester
- **offering.csv**: Available course offerings per semester

### Generated JSON Structure

Each student object includes:

```json
{
  "id": "S001",
  "name": "Mike Jones",
  "email": "mike.jones@college.edu",
  "gradYear": 2026,
  "expectedGraduation": "fa2026",
  "plan": {
    "fa2024": {
      "courses": [
        {
          "course_id": "C001",
          "department": "ENG",
          "number": "313",
          "title": "Foundations of Writing",
          "credits": 3,
          "status": "taken"
        }
      ],
      "semesterCredits": 3,
      "semesterStatus": "past"
    }
  },
  "totalCredits": 24,
  "completedCredits": 18,
  "plannedCredits": 6
}
```

## API Endpoints

### GET `/api/student/[id]`

Retrieve a specific student's complete academic plan.

### POST `/api/addCourse`

Add a course to a student's plan.

```json
{
  "studentId": "S001",
  "semester": "sp2025",
  "course": {
    "course_id": "CS101",
    "department": "CS",
    "number": "101",
    "title": "Intro to Computer Science",
    "credits": 3
  }
}
```

### POST `/api/removeCourse`

Remove a course from a student's plan.

```json
{
  "studentId": "S001",
  "semester": "sp2025",
  "courseId": "CS101"
}
```

### POST `/api/updateCourse`

Update course details in a student's plan.

```json
{
  "studentId": "S001",
  "semester": "sp2025",
  "oldCourseId": "CS101",
  "newCourse": {
    "course_id": "CS102",
    "title": "Advanced Computer Science",
    "credits": 4
  }
}
```

### POST `/api/send-alert`

Send a meeting request email to a student.

```json
{
  "student": {
    "id": "S001",
    "name": "Mike Jones",
    "email": "mike.jones@college.edu",
    "completedCredits": 45,
    "expectedGraduation": "Spring 2026"
  },
  "advisorName": "Dr. Smith",
  "alertType": "meeting_request"
}
```

### GET `/api/course-offerings`

Get all course offering patterns from the offering.csv file.

### GET `/api/available-courses?semester=Fall&year=2025`

Get courses available for a specific semester and year.

## Usage Guide

### For Academic Advisors

1. **Dashboard Overview**

   - View all students with progress indicators
   - See completion percentages and credit totals
   - Filter by graduation year status

2. **Student Plan Management**

   - Click on any student to view their four-year plan
   - Past semesters show completed courses (read-only)
   - Future semesters allow course modifications

3. **Course Management**

   - **Add Course**: Click the '+' button on future semesters
   - **Edit Course**: Click the edit icon on planned courses
   - **Remove Course**: Click the trash icon on planned courses

4. **Progress Tracking**
   - Monitor total credits and completion status
   - View semester-by-semester credit distribution
   - Track progress toward graduation requirements

5. **Email Alert System**
   - **At-Risk Students**: Automatically identified based on credit progress
   - **Individual Alerts**: Send meeting requests to specific students
   - **Bulk Alerts**: Send meeting requests to all at-risk students
   - **Rich Email Content**: Professional HTML emails with student progress details

### Key Features

- **Color-coded Semesters**: Past (gray), Current (blue), Future (green)
- **Real-time Updates**: Credits recalculated automatically
- **Validation**: Prevents duplicate courses and invalid operations
- **Responsive Design**: Works on desktop and mobile devices

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `node scripts/precombine.js` - Regenerate student data from CSV

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Email Service**: SendGrid API v3
- **Data Processing**: Node.js file system operations
- **Environment Management**: dotenv for secure configuration

## Customization

### Adding New Data Fields

1. Update CSV files with new columns
2. Modify `scripts/precombine.js` to process new fields
3. Update TypeScript interfaces in components
4. Regenerate data with `node scripts/precombine.js`

### Styling Modifications

- Edit Tailwind classes in components
- Modify color schemes in utility functions
- Customize responsive breakpoints as needed

## Troubleshooting

### Common Issues

1. **Students not loading**: Check that `public/students.json` exists
2. **API errors**: Ensure `app/data/students.json` is up to date
3. **Build errors**: Run `npm run build` to check for TypeScript issues
4. **Email not sending**:
   - Verify `SENDGRID_API_KEY` is set in `.env.local`
   - Ensure API key starts with "SG."
   - Check that sender email is verified in SendGrid
   - Review server logs for detailed error messages
5. **Environment variables not loading**:
   - Ensure `.env.local` is UTF-8 encoded (not UTF-16)
   - Restart development server after changing environment files
   - Check for typos in variable names

### Data Regeneration

If you modify CSV files, always regenerate the JSON data:

```bash
node scripts/precombine.js
cp app/data/students.json public/students.json
```

## Future Enhancements

- [ ] Course prerequisite validation
- [ ] Graduation requirement checking
- [ ] Export functionality (PDF reports)
- [ ] SMS notifications via Twilio integration
- [ ] Calendar integration for meeting scheduling
- [ ] Integration with external student information systems
- [ ] Advanced analytics and reporting dashboard
- [ ] Multi-language email templates
- [x] ~~Email alert system for at-risk students~~ ✅ **Completed**
- [x] ~~filtering and search~~ ✅ **Completed**
- [x] ~~Bulk operations for multiple students~~ ✅ **Completed**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request


