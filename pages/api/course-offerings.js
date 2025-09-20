import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const offeringPath = path.join(process.cwd(), 'app', 'data', 'offering.csv');

    if (!fs.existsSync(offeringPath)) {
      return res.status(404).json({ message: 'Offering data not found' });
    }

    const offeringData = fs.readFileSync(offeringPath, 'utf8');
    const lines = offeringData.trim().split('\n');
    const offerings = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 2) {
        const courseId = parts[0].replace(/['"]/g, '').trim();
        const offeringCode = parts[1].replace(/['"]/g, '').trim();
        offerings[courseId] = offeringCode;
      }
    }

    res.status(200).json(offerings);
  } catch (error) {
    console.error('Error loading offering data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}