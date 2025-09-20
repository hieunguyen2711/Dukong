"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FourYearPlan from "../../../components/FourYearPlan";

export default function StudentPage() {
  const params = useParams();
  const studentId = params?.id as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <FourYearPlan studentId={studentId} />
    </div>
  );
}
