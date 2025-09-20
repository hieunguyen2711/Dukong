let offeringCache = null;

async function loadOfferingData() {
  if (offeringCache) {
    return offeringCache;
  }

  try {
    const response = await fetch('/api/course-offerings');
    if (!response.ok) {
      throw new Error('Failed to load offering data');
    }

    const offerings = await response.json();
    offeringCache = offerings;
    return offerings;
  } catch (error) {
    console.error('Error loading offering data:', error);
    return {};
  }
}

function parseSemester(semester) {
  const match = semester.match(/(fa|sp)(\d{4})/);
  if (!match) return null;

  const [, semesterType, yearStr] = match;
  const year = parseInt(yearStr);
  const isFall = semesterType === 'fa';
  const isSpring = semesterType === 'sp';

  return { year, isFall, isSpring };
}

function isOddYear(year) {
  return year % 2 === 1;
}

function isEvenYear(year) {
  return year % 2 === 0;
}

export async function isCourseOffered(courseId, semester, year) {
  const offerings = await loadOfferingData();
  const offeringCode = offerings[courseId];

  if (!offeringCode) {
    return false;
  }

  // Convert semester name to short form
  const semesterShort = semester.toLowerCase() === 'fall' ? 'fa' :
                       semester.toLowerCase() === 'spring' ? 'sp' :
                       semester.toLowerCase();

  const semesterInfo = parseSemester(`${semesterShort}${year}`);
  if (!semesterInfo) return false;

  switch (offeringCode) {
    case 'e':
      return true;  // every semester
    case 'ef':
      return semesterInfo.isFall;  // every fall
    case 'es':
      return semesterInfo.isSpring;  // every spring
    case 'fo':
      return semesterInfo.isFall && isOddYear(semesterInfo.year);  // odd falls
    case 'fe':
      return semesterInfo.isFall && isEvenYear(semesterInfo.year);  // even falls
    case 'so':
      return semesterInfo.isSpring && isOddYear(semesterInfo.year);  // odd springs
    case 'se':
      return semesterInfo.isSpring && isEvenYear(semesterInfo.year);  // even springs
    case 'sp':
      return semesterInfo.isSpring;  // treat 'sp' same as 'es' (every spring)
    default:
      return false;
  }
}

export async function getAvailableCoursesForSemester(semester, year) {
  const offerings = await loadOfferingData();
  const availableCourses = [];

  for (const [courseId, offeringCode] of Object.entries(offerings)) {
    if (await isCourseOffered(courseId, semester, year)) {
      availableCourses.push(courseId);
    }
  }

  return availableCourses;
}

export async function validateCourseSelection(courseId, semester, year) {
  const isOffered = await isCourseOffered(courseId, semester, year);

  if (isOffered) {
    return {
      valid: true,
      message: 'Course is available for this semester'
    };
  }

  const offerings = await loadOfferingData();
  const offeringCode = offerings[courseId];

  if (!offeringCode) {
    return {
      valid: false,
      message: 'Course offering information not found'
    };
  }

  const suggestions = getOfferingSuggestions(courseId, offeringCode, year);

  return {
    valid: false,
    message: `Course is not offered in ${semester} ${year}. ${suggestions}`
  };
}

function getOfferingSuggestions(courseId, offeringCode, currentYear) {
  switch (offeringCode) {
    case 'e':
      return 'Available every semester.';
    case 'ef':
      return 'Only offered in Fall semesters.';
    case 'es':
      return 'Only offered in Spring semesters.';
    case 'sp':
      return 'Only offered in Spring semesters.';
    case 'fo':
      return `Offered in Fall semesters of odd years. Next available: Fall ${isOddYear(currentYear) ? currentYear : currentYear + 1}.`;
    case 'fe':
      return `Offered in Fall semesters of even years. Next available: Fall ${isEvenYear(currentYear) ? currentYear : currentYear + 1}.`;
    case 'so':
      const nextOddSpring = isOddYear(currentYear + 1) ? currentYear + 1 : currentYear + 2;
      return `Offered in Spring semesters of odd years. Next available: Spring ${nextOddSpring}.`;
    case 'se':
      const nextEvenSpring = isEvenYear(currentYear + 1) ? currentYear + 1 : currentYear + 2;
      return `Offered in Spring semesters of even years. Next available: Spring ${nextEvenSpring}.`;
    default:
      return 'Check course catalog for availability.';
  }
}

export async function getOfferingDescription(courseId) {
  const offerings = await loadOfferingData();
  const offeringCode = offerings[courseId];

  if (!offeringCode) {
    return 'Offering information not available';
  }

  switch (offeringCode) {
    case 'e':
      return 'Every semester';
    case 'ef':
      return 'Every fall semester';
    case 'es':
      return 'Every spring semester';
    case 'sp':
      return 'Every spring semester';
    case 'fo':
      return 'Odd-numbered fall semesters';
    case 'fe':
      return 'Even-numbered fall semesters';
    case 'so':
      return 'Odd-numbered spring semesters';
    case 'se':
      return 'Even-numbered spring semesters';
    default:
      return 'Unknown offering pattern';
  }
}

export function clearOfferingCache() {
  offeringCache = null;
}