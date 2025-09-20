import fs from 'fs';
import path from 'path';
import { isCourseOffered } from '../../utils/courseOffering.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { semester, year } = req.query;

    if (!semester || !year) {
      return res.status(400).json({
        message: 'Missing required parameters: semester and year'
      });
    }

    // Load course data
    const coursePath = path.join(process.cwd(), 'app', 'data', 'course.csv');

    if (!fs.existsSync(coursePath)) {
      return res.status(404).json({ message: 'Course data not found' });
    }

    const courseData = fs.readFileSync(coursePath, 'utf8');
    const lines = courseData.trim().split('\n');
    const courses = [];

    // Parse course CSV
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV with quoted fields
      const parts = line.split(',').map(part => part.replace(/^'|'$/g, '').trim());

      if (parts.length >= 6) {
        const courseInfo = {
          course_id: parts[0],
          department: parts[1],
          number: parts[2],
          title: parts[3],
          min_credits: parseInt(parts[4]) || 3,
          max_credits: parseInt(parts[5]) || 3,
          credits: parseInt(parts[4]) || 3 // Default to min credits
        };

        // Check if this course is offered in the requested semester
        const isOffered = isCourseOffered(courseInfo.course_id, semester, parseInt(year));

        if (isOffered) {
          courses.push(courseInfo);
        }
      }
    }

    // Sort courses by department and number
    courses.sort((a, b) => {
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department);
      }
      return a.number.localeCompare(b.number);
    });

    res.status(200).json({
      semester,
      year: parseInt(year),
      total_available: courses.length,
      courses
    });

  } catch (error) {
    console.error('Error getting available courses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}