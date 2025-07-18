"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface TeamMetrics {
  totalAgents: number;
  agentsCoached: number;
  monthlyCoachingCoverage: number;
  averageNotesPerAgent: number;
  teamCSAT: number;
  teamFCR: number;
  teamAHT: number;
  teamQualityScore: number;
  activeSessions: number;
  completedSessionsThisMonth: number;
  pendingActionItems: number;
  overallTeamScore: number;
}

export default function TeamOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Simulate loading team metrics - replace with actual API call
    const mockTeamMetrics: TeamMetrics = {
      totalAgents: 24,
      agentsCoached: 18,
      monthlyCoachingCoverage: 75,
      averageNotesPerAgent: 4.2,
      teamCSAT: 87,
      teamFCR: 82,
      teamAHT: 345, // seconds
      teamQualityScore: 91,
      activeSessions: 3,
      completedSessionsThisMonth: 42,
      pendingActionItems: 15,
      overallTeamScore: 85
    };

    setTimeout(() => {
      setTeamMetrics(mockTeamMetrics);
      setLoading(false);
    }, 1000);
  }, []);

  // Handle navigation
  const handleStartSession = () => {
    router.push('/coaching-session');
  };

  const handleViewAgentDetail = (agentId: string) => {
    // Navigate to agent detail or start session with specific agent
    router.push(`/coaching-session?agent=${agentId}`);
  };

  // Suppress unused warning for now - will be used when agent cards are clickable
  void handleViewAgentDetail;

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading team metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* SmartSource Header */}
      <header className="bg-gradient-to-r from-[#2B4C8C] to-[#1e3a6b] shadow-lg border-b-4 border-[#4ECDC4]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2 shadow-md">
                <div className="text-[#2B4C8C] font-bold text-lg">SS</div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Team Performance Overview</h1>
                <p className="text-[#4ECDC4] text-sm">SmartSource Coaching Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-white">
                <p className="font-medium">{session?.user?.name || 'Team Leader'}</p>
                <p className="text-sm text-[#4ECDC4]">{session?.user?.role || 'TEAM_LEADER'}</p>
              </div>
              
              {/* Action Menu */}
              <div className="flex items-center gap-2">
                {/* Admin Panel Button */}
                {session?.user?.role === 'ADMIN' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 text-white hover:text-[#4ECDC4] px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Admin Panel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin
                  </button>
                )}

                {/* Settings Button */}
                <button
                  onClick={() => router.push('/settings')}
                  className="text-white hover:text-[#4ECDC4] p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-white hover:text-red-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={handleStartSession}
                className="bg-[#4ECDC4] hover:bg-[#45b8ac] text-[#2B4C8C] px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Start Coaching Session
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-[calc(100vh-100px)]">
        <div className="space-y-6">
          {/* Team Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Total Team Size */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  Team Size
                </h4>
                <span className="text-xl font-bold text-blue-600">{teamMetrics?.totalAgents}</span>
              </div>
              <div className="text-xs text-gray-600">Active agents</div>
            </div>

            {/* Coaching Coverage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Coverage
                </h4>
                <span className="text-xl font-bold text-green-600">{teamMetrics?.monthlyCoachingCoverage}%</span>
              </div>
              <div className="text-xs text-gray-600">{teamMetrics?.agentsCoached}/{teamMetrics?.totalAgents} coached this month</div>
            </div>

            {/* Average Notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  Avg Notes
                </h4>
                <span className="text-xl font-bold text-purple-600">{teamMetrics?.averageNotesPerAgent}</span>
              </div>
              <div className="text-xs text-gray-600">Notes per agent</div>
            </div>

            {/* Team Score */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Team Score
                </h4>
                <span className="text-xl font-bold text-indigo-600">{teamMetrics?.overallTeamScore}</span>
              </div>
              <div className="text-xs text-gray-600">Overall performance</div>
            </div>
          </div>

          {/* Team KPI Performance */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Team KPI Performance</h3>
              <p className="text-sm text-gray-600">Aggregated performance metrics across your team</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Team CSAT */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{teamMetrics?.teamCSAT}%</div>
                  <div className="text-sm text-gray-600">Customer Satisfaction</div>
                  <div className="text-xs text-green-600 mt-1">↑ +2.3% vs last month</div>
                </div>

                {/* Team FCR */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">{teamMetrics?.teamFCR}%</div>
                  <div className="text-sm text-gray-600">First Call Resolution</div>
                  <div className="text-xs text-red-600 mt-1">↓ -1.2% vs last month</div>
                </div>

                {/* Team AHT */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {teamMetrics ? `${Math.floor(teamMetrics.teamAHT / 60)}:${String(teamMetrics.teamAHT % 60).padStart(2, '0')}` : '--:--'}
                  </div>
                  <div className="text-sm text-gray-600">Average Handle Time</div>
                  <div className="text-xs text-green-600 mt-1">↓ -15s vs last month</div>
                </div>

                {/* Team Quality */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mb-1">{teamMetrics?.teamQualityScore}%</div>
                  <div className="text-sm text-gray-600">Quality Score</div>
                  <div className="text-xs text-green-600 mt-1">↑ +0.8% vs last month</div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coaching Activity */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Coaching Activity</h3>
                <p className="text-sm text-gray-600">Current coaching session status and recent activity</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Sessions</span>
                    <span className="text-lg font-semibold text-green-600">{teamMetrics?.activeSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed This Month</span>
                    <span className="text-lg font-semibold text-blue-600">{teamMetrics?.completedSessionsThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Action Items</span>
                    <span className="text-lg font-semibold text-orange-600">{teamMetrics?.pendingActionItems}</span>
                  </div>
                </div>
                
                {/* Coaching Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Monthly Coaching Target</span>
                    <span>{teamMetrics?.monthlyCoachingCoverage}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${teamMetrics?.monthlyCoachingCoverage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Actions</h3>
                <p className="text-sm text-gray-600">Common team leader tasks and shortcuts</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={handleStartSession}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">Start New Coaching Session</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">View Team Reports</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h9.586a1 1 0 00.707-.293l5.414-5.414a1 1 0 00.293-.707V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">Review Action Items</span>
                    </div>
                    <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium">
                      {teamMetrics?.pendingActionItems}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
