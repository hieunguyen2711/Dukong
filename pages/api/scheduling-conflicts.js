const fs = require('fs');
const path = require('path');

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
  const headers = lines[0].split(',').map(h => h.replace(/'/g, '').trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/'/g, '').trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
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
  const sectionsForCourse = sectionData.filter(section => {
    const courseKey = `${section['dept code']}${section['crs num']}`;
    return courseKey === courseId && section.sem === semester;
  });
  
  return sectionsForCourse.length;
}

// Determine if a course is upper-level based on course number
function isUpperLevel(courseNumber) {
  const num = parseInt(courseNumber);
  return num >= 300;
}

// Determine student year classification based on graduation date and current semester
function getStudentYear(student, currentSemester) {
  const semesterYear = parseInt(currentSemester.slice(-4));
  const semesterType = currentSemester.slice(0, 2);
  const gradYear = student.gradYear;
  const gradSemester = student.expectedGraduation;
  
  // Calculate years until graduation
  let yearsUntilGraduation;
  
  if (gradYear === semesterYear) {
    // Same year - check semester
    if (semesterType === 'sp' && gradSemester.startsWith('fa')) {
      yearsUntilGraduation = 0.5; // Graduating in fall, currently spring
    } else if (semesterType === 'fa' && gradSemester.startsWith('sp')) {
      yearsUntilGraduation = 0.5; // Graduating in spring, currently fall
    } else {
      yearsUntilGraduation = 0; // Same semester
    }
  } else {
    yearsUntilGraduation = gradYear - semesterYear;
    if (semesterType === 'sp' && gradSemester.startsWith('fa')) {
      yearsUntilGraduation -= 0.5; // Adjust for semester difference
    } else if (semesterType === 'fa' && gradSemester.startsWith('sp')) {
      yearsUntilGraduation += 0.5; // Adjust for semester difference
    }
  }
  
  // Classify based on years until graduation
  if (yearsUntilGraduation <= 0.5) {
    return 'Senior';
  } else if (yearsUntilGraduation <= 1.5) {
    return 'Junior';
  } else if (yearsUntilGraduation <= 2.5) {
    return 'Sophomore';
  } else {
    return 'Freshman';
  }
}

// Calculate seniority impact (students near graduation)
function calculateSeniorityImpact(students, targetSemester) {
  const semesterYear = parseInt(targetSemester.slice(-4));
  const semesterType = targetSemester.slice(0, 2);
  
  let seniorCount = 0;
  students.forEach(student => {
    const gradYear = student.gradYear;
    const gradSemester = student.expectedGraduation;
    
    // Check if student is graduating in the same year or very close
    if (gradYear === semesterYear) {
      // If it's spring semester and they're graduating in fall, they're seniors
      if (semesterType === 'sp' && gradSemester.startsWith('fa')) {
        seniorCount++;
      }
      // If it's fall semester and they're graduating in spring, they're seniors
      else if (semesterType === 'fa' && gradSemester.startsWith('sp')) {
        seniorCount++;
      }
    }
    // If graduating in the same semester, definitely a senior
    else if (gradSemester === targetSemester) {
      seniorCount++;
    }
  });
  
  return seniorCount;
}

// Calculate conflict level for a pair of courses using the correct formula:
// conflict_score = overlap * (rarityWeightA + rarityWeightB) * avg(seniorityWeights)
function calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester) {
  const overlap = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  ).length;
  
  if (overlap === 0) return 0;
  
  // Calculate rarity weights: 1 / numSections
  const numSectionsA = calculateCourseRarity(courseA.course_id, sectionData, semester);
  const numSectionsB = calculateCourseRarity(courseB.course_id, sectionData, semester);
  const rarityWeightA = numSectionsA > 0 ? 1 / numSectionsA : 1; // Default to 1 if no sections found
  const rarityWeightB = numSectionsB > 0 ? 1 / numSectionsB : 1;
  
  // Calculate average seniority weight for overlapping students
  const overlappingStudents = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  );
  
  const seniorityWeights = overlappingStudents.map(student => {
    const studentYear = getStudentYear(student, semester);
    switch (studentYear) {
      case 'Senior': return 2.0;
      case 'Junior': return 1.5;
      case 'Sophomore':
      case 'Freshman':
      default: return 1.0;
    }
  });
  
  const avgSeniorityWeight = seniorityWeights.reduce((sum, weight) => sum + weight, 0) / seniorityWeights.length;
  
  // Apply the formula: overlap * (rarityWeightA + rarityWeightB) * avg(seniorityWeights)
  const conflictScore = overlap * (rarityWeightA + rarityWeightB) * avgSeniorityWeight;
  
  // Normalize to 0-1 scale for consistency with existing system
  // Scale factor can be adjusted based on typical conflict scores
  const normalizedScore = Math.min(conflictScore / 10, 1.0);
  
  return Math.round(normalizedScore * 100) / 100; // Round to 2 decimal places
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

// Main conflict analysis function
function analyzeSchedulingConflicts(semester) {
  const { students, courseData, sectionData } = loadData();
  const courseEnrollments = getCoursesForSemester(students, semester);
  
  const courses = Object.values(courseEnrollments);
  const conflicts = [];
  
  // Check all pairs of courses for conflicts
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const courseA = courses[i];
      const courseB = courses[j];
      
      const overlap = courseA.students.filter(studentA => 
        courseB.students.some(studentB => studentA.id === studentB.id)
      ).length;
      
      if (overlap > 0) {
        const conflictLevel = calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester);
        const explanation = generateExplanation(courseA, courseB, overlap, sectionData, semester);
        
        // Determine rarity and seniority impact descriptions
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
  
  // Sort conflicts by conflict level (highest first)
  conflicts.sort((a, b) => b.conflictLevel - a.conflictLevel);
  
  return {
    semester: semester,
    conflicts: conflicts
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
    const result = analyzeSchedulingConflicts(semester);
    
    if (result.conflicts.length === 0) {
      result.conflicts = [];
      result.message = 'No significant conflicts detected.';
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error analyzing scheduling conflicts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
