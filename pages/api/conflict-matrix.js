const fs = require('fs');
const path = require('path');
const { isCourseOffered } = require('../../utils/courseOffering.js');

// Load data files
function loadData() {
  const studentsPath = path.join(process.cwd(), 'app', 'data', 'students.json');
  const coursePath = path.join(process.cwd(), 'app', 'data', 'course.csv');
  const sectionPath = path.join(process.cwd(), 'app', 'data', 'section.csv');
  
  const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
  const courseData = parseCSV(fs.readFileSync(coursePath, 'utf8'));
  const sectionData = parseCSV(fs.readFileSync(sectionPath, 'utf8'));
  
  return { students, courseData, sectionData };
}

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

// Get courses planned for a specific semester
function getCoursesForSemester(students, semester) {
  const courseEnrollments = {};
  
  students.forEach(student => {
    if (student.plan[semester] && student.plan[semester].courses) {
      student.plan[semester].courses.forEach(course => {
        if (course.status === 'planned') {
          const courseKey = course.course_id;
          if (!courseEnrollments[courseKey]) {
            courseEnrollments[courseKey] = {
              course_id: course.course_id,
              department: course.department,
              number: course.number,
              title: course.title,
              students: []
            };
          }
          courseEnrollments[courseKey].students.push({
            id: student.id,
            name: student.name,
            gradYear: student.gradYear,
            expectedGraduation: student.expectedGraduation
          });
        }
      });
    }
  });
  
  return courseEnrollments;
}

// Calculate course rarity based on section availability
function calculateCourseRarity(courseId, sectionData, semester) {
  const sectionsForCourse = sectionData.filter(section => 
    section.course_id === courseId && section.semester === semester
  );
  return sectionsForCourse.length;
}

// Check if course is upper level (300+)
function isUpperLevel(courseNumber) {
  const num = parseInt(courseNumber);
  return num >= 300;
}

// Calculate seniority impact
function calculateSeniorityImpact(students, targetSemester) {
  const currentYear = new Date().getFullYear();
  let seniorCount = 0;
  
  students.forEach(student => {
    const gradYear = student.gradYear;
    if (gradYear <= currentYear + 1) {
      seniorCount++;
    }
  });
  
  return seniorCount;
}

// Generate explanation for conflict
function generateExplanation(courseA, courseB, overlap, sectionData, semester) {
  const overlappingStudents = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  );
  
  const rarityA = calculateCourseRarity(courseA.course_id, sectionData, semester);
  const rarityB = calculateCourseRarity(courseB.course_id, sectionData, semester);
  const isUpperLevelA = isUpperLevel(courseA.number);
  const isUpperLevelB = isUpperLevel(courseB.number);
  
  const seniorCount = calculateSeniorityImpact(overlappingStudents, semester);
  
  let rarityText = '';
  if (rarityA === 1 && rarityB === 1) {
    rarityText = 'both are single-section';
  } else if (rarityA === 1 || rarityB === 1) {
    rarityText = 'one is single-section';
  }
  
  let levelText = '';
  if (isUpperLevelA && isUpperLevelB) {
    levelText = 'upper-level';
  } else if (isUpperLevelA || isUpperLevelB) {
    levelText = 'mixed-level';
  }
  
  let seniorityText = '';
  if (seniorCount > 0) {
    seniorityText = `${seniorCount} graduating senior${seniorCount > 1 ? 's' : ''} affected`;
  }
  
  const parts = [
    `${overlap} student${overlap > 1 ? 's' : ''} plan${overlap === 1 ? 's' : ''} to take both`,
    rarityText && levelText ? `${rarityText} ${levelText} courses` : rarityText || levelText ? `${rarityText || levelText} courses` : '',
    seniorityText
  ].filter(part => part);
  
  return parts.join('; ') + '.';
}

// Calculate conflict level for a pair of courses
function calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester) {
  const overlap = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  ).length;
  
  if (overlap === 0) return 0;
  
  // Calculate rarity impact
  const rarityA = calculateCourseRarity(courseA.course_id, sectionData, semester);
  const rarityB = calculateCourseRarity(courseB.course_id, sectionData, semester);
  const isUpperLevelA = isUpperLevel(courseA.number);
  const isUpperLevelB = isUpperLevel(courseB.number);
  
  let rarityImpact = 0;
  if (rarityA === 1 && rarityB === 1) {
    rarityImpact = 0.3;
  } else if (rarityA === 1 || rarityB === 1) {
    rarityImpact = 0.15;
  }
  
  if (isUpperLevelA && isUpperLevelB) {
    rarityImpact += 0.2;
  } else if (isUpperLevelA || isUpperLevelB) {
    rarityImpact += 0.1;
  }
  
  // Calculate seniority impact
  const overlappingStudents = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  );
  const seniorCount = calculateSeniorityImpact(overlappingStudents, semester);
  const seniorityImpact = seniorCount > 0 ? (seniorCount / overlappingStudents.length) * 0.3 : 0;
  
  // Base conflict score from overlap
  const overlapScore = Math.min(overlap / 10, 0.4); // Normalize overlap, max 0.4
  
  // Total conflict level
  const conflictLevel = overlapScore + rarityImpact + seniorityImpact;
  
  return Math.min(conflictLevel, 1.0); // Cap at 1.0
}

// Generate conflict matrix
function generateConflictMatrix(semester) {
  const { students, courseData, sectionData } = loadData();
  const courseEnrollments = getCoursesForSemester(students, semester);
  
  // Parse semester to get year and semester type
  const semesterMatch = semester.match(/(fa|sp)(\d{4})/);
  if (!semesterMatch) {
    throw new Error('Invalid semester format');
  }
  
  const [, semesterType, yearStr] = semesterMatch;
  const year = parseInt(yearStr);
  const semesterName = semesterType === 'fa' ? 'Fall' : 'Spring';
  
  // Filter courses to only include those offered in this semester
  const offeredCourses = Object.values(courseEnrollments).filter(course => {
    return isCourseOffered(course.course_id, semesterName, year);
  });
  
  const courseList = offeredCourses.map(course => ({
    id: course.course_id,
    code: `${course.department}${course.number}`,
    title: course.title,
    department: course.department,
    number: course.number
  }));
  
  // Sort courses by department and number for consistent ordering
  courseList.sort((a, b) => {
    if (a.department !== b.department) {
      return a.department.localeCompare(b.department);
    }
    return parseInt(a.number) - parseInt(b.number);
  });
  
  // Create matrix and collect conflicts using the same logic as main conflicts API
  const matrix = [];
  const conflicts = [];
  
  // Use the exact same logic as the main conflicts API
  for (let i = 0; i < offeredCourses.length; i++) {
    for (let j = i + 1; j < offeredCourses.length; j++) {
      const courseA = offeredCourses[i];
      const courseB = offeredCourses[j];
      
      const overlap = courseA.students.filter(studentA => 
        courseB.students.some(studentB => studentA.id === studentB.id)
      ).length;
      
      if (overlap > 0) {
        const conflictLevel = calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester);
        const explanation = generateExplanation(courseA, courseB, overlap, sectionData, semester);
        
        // Determine rarity and seniority impact descriptions (same as main API)
        const rarityA = calculateCourseRarity(courseA.course_id, sectionData, semester);
        const rarityB = calculateCourseRarity(courseB.course_id, sectionData, semester);
        const isUpperLevelA = isUpperLevel(courseA.number);
        const isUpperLevelB = isUpperLevel(courseB.number);
        
        let rarityImpact = '';
        if (rarityA === 1 && rarityB === 1) {
          rarityImpact = 'Both are single-section upper-level';
        } else if (rarityA === 1 || rarityB === 1) {
          rarityImpact = 'One is single-section upper-level';
        } else if (isUpperLevelA && isUpperLevelB) {
          rarityImpact = 'Both are upper-level courses';
        } else {
          rarityImpact = 'Standard course availability';
        }
        
        const overlappingStudents = courseA.students.filter(studentA => 
          courseB.students.some(studentB => studentA.id === studentB.id)
        );
        const seniorCount = calculateSeniorityImpact(overlappingStudents, semester);
        const seniorityImpact = seniorCount > 0 ? `${seniorCount} graduating senior${seniorCount > 1 ? 's' : ''} affected` : 'No graduating seniors affected';
        
        conflicts.push({
          courseA: `${courseA.department}${courseA.number}`,
          courseB: `${courseB.department}${courseB.number}`,
          overlap: overlap,
          rarityImpact: rarityImpact,
          seniorityImpact: seniorityImpact,
          conflictLevel: Math.round(conflictLevel * 100) / 100,
          explanation: explanation
        });
      }
    }
  }
  
  // Now create the matrix using the course list order
  for (let i = 0; i < courseList.length; i++) {
    const row = [];
    for (let j = 0; j < courseList.length; j++) {
      if (i === j) {
        // Same course - no conflict
        row.push(0);
      } else {
        const courseA = offeredCourses.find(c => c.course_id === courseList[i].id);
        const courseB = offeredCourses.find(c => c.course_id === courseList[j].id);
        
        if (courseA && courseB) {
          const overlap = courseA.students.filter(studentA => 
            courseB.students.some(studentB => studentA.id === studentB.id)
          ).length;
          
          if (overlap > 0) {
            const conflictLevel = calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester);
            const roundedLevel = Math.round(conflictLevel * 100) / 100;
            row.push(roundedLevel);
          } else {
            row.push(0);
          }
        } else {
          row.push(0);
        }
      }
    }
    matrix.push(row);
  }
  
  // Sort conflicts by conflict level (highest first)
  conflicts.sort((a, b) => b.conflictLevel - a.conflictLevel);
  
  return {
    semester: semester,
    courses: courseList,
    matrix: matrix,
    conflicts: conflicts,
    totalOffered: courseList.length,
    totalPlanned: Object.keys(courseEnrollments).length
  };
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { semester } = req.query;

  if (!semester) {
    return res.status(400).json({ error: 'Semester parameter is required' });
  }

  try {
    const matrixData = generateConflictMatrix(semester);
    res.status(200).json(matrixData);
  } catch (error) {
    console.error('Error generating conflict matrix:', error);
    res.status(500).json({ error: 'Failed to generate conflict matrix' });
  }
}
