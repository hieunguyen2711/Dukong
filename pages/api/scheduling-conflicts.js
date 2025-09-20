/**
 * SCHEDULING CONFLICTS API
 * 
 * This API analyzes student course plans for a given semester and identifies
 * scheduling conflicts between courses. It uses a sophisticated conflict scoring
 * system that considers:
 * - Number of students planning to take both courses (overlap)
 * - Course rarity (number of sections offered)
 * - Student seniority (graduation proximity)
 * 
 * Formula: conflict_score = overlap * (rarityWeightA + rarityWeightB) * avg(seniorityWeights)
 * Where:
 * - rarityWeight = 1 / numSections (single-section courses get higher weight)
 * - seniorityWeights: Seniors=2.0, Juniors=1.5, Sophomores/Freshmen=1.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Load all required data files for conflict analysis
 * @returns {Object} Object containing students, courseData, and sectionData
 */
function loadData() {
  // Define paths to data files
  const studentsPath = path.join(process.cwd(), 'app', 'data', 'students.json');
  const coursePath = path.join(process.cwd(), 'app', 'data', 'course.csv');
  const sectionPath = path.join(process.cwd(), 'app', 'data', 'section.csv');
  
  // Load and parse data files
  const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
  const courseData = parseCSV(fs.readFileSync(coursePath, 'utf8'));
  const sectionData = parseCSV(fs.readFileSync(sectionPath, 'utf8'));
  
  return { students, courseData, sectionData };
}

/**
 * Parse CSV content into JavaScript objects
 * @param {string} csvContent - Raw CSV content as string
 * @returns {Array} Array of objects with CSV data
 */
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/'/g, '').trim());
  const data = [];
  
  // Process each data row (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/'/g, '').trim());
    const row = {};
    
    // Map each value to its corresponding header
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Extract all courses planned by students for a specific semester
 * @param {Array} students - Array of student objects
 * @param {string} semester - Target semester (e.g., 'sp2026')
 * @returns {Object} Object with course IDs as keys and course enrollment data as values
 */
function getCoursesForSemester(students, semester) {
  const courseEnrollments = {};
  
  // Iterate through all students
  students.forEach(student => {
    // Check if student has a plan for the target semester
    if (student.plan[semester] && student.plan[semester].courses) {
      // Process each course in the student's plan
      student.plan[semester].courses.forEach(course => {
        // Only include courses with 'planned' status
        if (course.status === 'planned') {
          const courseKey = course.course_id;
          
          // Initialize course entry if it doesn't exist
          if (!courseEnrollments[courseKey]) {
            courseEnrollments[courseKey] = {
              course_id: course.course_id,
              department: course.department,
              number: course.number,
              title: course.title,
              students: []
            };
          }
          
          // Add student to the course's enrollment list
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

/**
 * Calculate how many sections of a course are offered in a specific semester
 * This determines course rarity - fewer sections = higher rarity weight
 * @param {string} courseId - Course identifier (e.g., 'BIO408')
 * @param {Array} sectionData - Array of section data from section.csv
 * @param {string} semester - Target semester (e.g., 'sp2026')
 * @returns {number} Number of sections offered for this course
 */
function calculateCourseRarity(courseId, sectionData, semester) {
  // Filter sections to find those matching the course and semester
  const sectionsForCourse = sectionData.filter(section => {
    const courseKey = `${section['dept code']}${section['crs num']}`;
    return courseKey === courseId && section.sem === semester;
  });
  
  return sectionsForCourse.length;
}

/**
 * Determine if a course is upper-level based on course number
 * Upper-level courses (300+) typically have fewer sections and higher conflict impact
 * @param {string} courseNumber - Course number (e.g., '408', '115')
 * @returns {boolean} True if course is upper-level (300+)
 */
function isUpperLevel(courseNumber) {
  const num = parseInt(courseNumber);
  return num >= 300;
}

/**
 * Determine student year classification based on graduation date and current semester
 * This is used to assign seniority weights in conflict calculations
 * @param {Object} student - Student object with gradYear and expectedGraduation
 * @param {string} currentSemester - Current semester (e.g., 'sp2026')
 * @returns {string} Student year: 'Senior', 'Junior', 'Sophomore', or 'Freshman'
 */
function getStudentYear(student, currentSemester) {
  const semesterYear = parseInt(currentSemester.slice(-4));
  const semesterType = currentSemester.slice(0, 2);
  const gradYear = student.gradYear;
  const gradSemester = student.expectedGraduation;
  
  // Calculate years until graduation
  let yearsUntilGraduation;
  
  if (gradYear === semesterYear) {
    // Same year - check semester timing
    if (semesterType === 'sp' && gradSemester.startsWith('fa')) {
      yearsUntilGraduation = 0.5; // Graduating in fall, currently spring
    } else if (semesterType === 'fa' && gradSemester.startsWith('sp')) {
      yearsUntilGraduation = 0.5; // Graduating in spring, currently fall
    } else {
      yearsUntilGraduation = 0; // Same semester
    }
  } else {
    // Different years - calculate difference
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

/**
 * Calculate conflict level for a pair of courses using the sophisticated formula:
 * conflict_score = overlap * (rarityWeightA + rarityWeightB) * avg(seniorityWeights)
 * 
 * This formula considers:
 * - Overlap: Number of students planning to take both courses
 * - Rarity: Single-section courses get higher weight (1/numSections)
 * - Seniority: Seniors get 2.0x weight, Juniors 1.5x, others 1.0x
 * 
 * @param {Object} courseA - First course object with students array
 * @param {Object} courseB - Second course object with students array
 * @param {Object} courseEnrollments - All course enrollment data
 * @param {Array} sectionData - Section data from section.csv
 * @param {string} semester - Target semester
 * @returns {number} Conflict score between 0 and 1
 */
function calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester) {
  // Step 1: Calculate student overlap between the two courses
  const overlap = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  ).length;
  
  // No overlap means no conflict
  if (overlap === 0) return 0;
  
  // Step 2: Calculate rarity weights (1 / number of sections)
  // Single-section courses get weight 1.0, multi-section courses get lower weights
  const numSectionsA = calculateCourseRarity(courseA.course_id, sectionData, semester);
  const numSectionsB = calculateCourseRarity(courseB.course_id, sectionData, semester);
  const rarityWeightA = numSectionsA > 0 ? 1 / numSectionsA : 1; // Default to 1 if no sections found
  const rarityWeightB = numSectionsB > 0 ? 1 / numSectionsB : 1;
  
  // Step 3: Calculate average seniority weight for overlapping students
  const overlappingStudents = courseA.students.filter(studentA => 
    courseB.students.some(studentB => studentA.id === studentB.id)
  );
  
  // Assign seniority weights based on student year classification
  const seniorityWeights = overlappingStudents.map(student => {
    const studentYear = getStudentYear(student, semester);
    switch (studentYear) {
      case 'Senior': return 2.0;    // Highest priority - near graduation
      case 'Junior': return 1.5;    // Medium priority
      case 'Sophomore':
      case 'Freshman':
      default: return 1.0;          // Standard priority
    }
  });
  
  // Calculate average seniority weight across all overlapping students
  const avgSeniorityWeight = seniorityWeights.reduce((sum, weight) => sum + weight, 0) / seniorityWeights.length;
  
  // Step 4: Apply the conflict formula
  const conflictScore = overlap * (rarityWeightA + rarityWeightB) * avgSeniorityWeight;
  
  // Step 5: Normalize to 0-1 scale for consistency with existing system
  // Scale factor (10) can be adjusted based on typical conflict scores
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

/**
 * Main function to analyze scheduling conflicts for a given semester
 * This function:
 * 1. Loads all student and course data
 * 2. Analyzes all course pairs for conflicts
 * 3. Returns sorted list of conflicts with detailed explanations
 * 
 * @param {string} semester - Target semester (e.g., 'sp2026')
 * @returns {Object} Object containing semester and conflicts array
 */
function analyzeSchedulingConflicts(semester) {
  // Load all required data
  const { students, courseData, sectionData } = loadData();
  const courseEnrollments = getCoursesForSemester(students, semester);
  
  // Get all courses planned by students for this semester
  const courses = Object.values(courseEnrollments);
  const conflicts = [];
  
  // Step 1: Check all pairs of courses for conflicts
  // Using nested loops with j = i + 1 to avoid duplicate pairs
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const courseA = courses[i];
      const courseB = courses[j];
      
      // Calculate student overlap between the two courses
      const overlap = courseA.students.filter(studentA => 
        courseB.students.some(studentB => studentA.id === studentB.id)
      ).length;
      
      // Only proceed if there's actual student overlap
      if (overlap > 0) {
        // Step 2: Calculate conflict level using our sophisticated formula
        const conflictLevel = calculateConflictLevel(courseA, courseB, courseEnrollments, sectionData, semester);
        const explanation = generateExplanation(courseA, courseB, overlap, sectionData, semester);
        
        // Step 3: Generate descriptive impact information
        const rarityA = calculateCourseRarity(courseA.course_id, sectionData, semester);
        const rarityB = calculateCourseRarity(courseB.course_id, sectionData, semester);
        const isUpperLevelA = isUpperLevel(courseA.number);
        const isUpperLevelB = isUpperLevel(courseB.number);
        
        // Determine rarity impact description
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
        
        // Calculate seniority impact
        const overlappingStudents = courseA.students.filter(studentA => 
          courseB.students.some(studentB => studentA.id === studentB.id)
        );
        const seniorCount = calculateSeniorityImpact(overlappingStudents, semester);
        const seniorityImpact = seniorCount > 0 ? `${seniorCount} graduating senior${seniorCount > 1 ? 's' : ''} affected` : 'No graduating seniors affected';
        
        // Step 4: Add conflict to results
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
  
  // Step 5: Sort conflicts by conflict level (highest first) for priority ranking
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
