"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to team overview on page load
    router.push('/team-overview');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B4C8C] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Team Overview...</p>
      </div>
    </div>
  );
}
