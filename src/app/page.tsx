"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return; // Still loading
    
    if (status === "unauthenticated") {
      // User is not authenticated, redirect to login
      router.push('/login');
    } else if (session) {
      // User is authenticated, redirect to team overview
      router.push('/team-overview');
    }
  }, [router, session, status]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B4C8C] mx-auto mb-4"></div>
        <p className="text-gray-600">
          {status === "loading" ? "Loading..." : 
           status === "unauthenticated" ? "Redirecting to Login..." : 
           "Redirecting to Team Overview..."}
        </p>
      </div>
    </div>
  );
}
