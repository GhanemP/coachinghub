"use client";
import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Session {
  id: string;
  sessionNumber: number;
  type: string;
  status: string;
  scheduledDate: string;
  duration?: number;
  overallScore?: number;
  summary?: string;
  teamLeaderId?: string;
  agentId?: string;
}

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedDate?: string;
  sessionId?: string;
  assignedTo?: User;
  createdBy?: User;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue?: string;
  currentValue?: string;
  progress?: number;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<string>("notes");
  const [timer, setTimer] = useState<string>("00:00");
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSessionPaused, setIsSessionPaused] = useState<boolean>(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Track elapsed seconds
  const [notes, setNotes] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  
  // Database state
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [previousSessions, setPreviousSessions] = useState<Session[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showActionItemForm, setShowActionItemForm] = useState<boolean>(false);
  const [newActionItem, setNewActionItem] = useState({ title: '', description: '' });
  const [selectedPreviousSession, setSelectedPreviousSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
type AgentUser = User & { department?: string; tenure?: string };
const [agents, setAgents] = useState<AgentUser[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  
  // Widget position state
  const [widgetPosition, setWidgetPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Helper function to refresh session data
  const refreshSessions = async () => {
    try {
      const sessionsRes = await fetch('/api/session');
      const sessions = await sessionsRes.json();
      
      // Show all sessions (completed, draft, etc.) sorted by most recent first
      const allSessions = sessions
        .filter((s: Session) => s.status !== 'ACTIVE' && s.status !== 'PAUSED') // Don't show currently active sessions
        .sort((a: Session, b: Session) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
      
      setPreviousSessions(allSessions);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  };

  // Helper function to calculate progress percentage for goals
  const calculateProgress = (goal: Goal): number => {
    if (goal.progress !== undefined) return goal.progress;
    
    // Try to parse currentValue and targetValue if they're numeric strings
    const current = parseFloat(goal.currentValue?.replace(/[^\d.]/g, '') || '0');
    const target = parseFloat(goal.targetValue?.replace(/[^\d.]/g, '') || '0');
    
    if (target > 0) {
      return Math.min(100, Math.round((current / target) * 100));
    }
    return 0;
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Timer functionality - manual control
  const startSession = async () => {
    if (!isSessionActive) {
      let sessionToUse = currentSession;
      
      // First, create a session if one doesn't exist
      if (!sessionToUse) {
        sessionToUse = await createCurrentSession();
        if (!sessionToUse) {
          console.error('Failed to create session');
          return;
        }
        // Use the newly created session to start
        setCurrentSession(sessionToUse);
      }
      
      setIsSessionActive(true);
      setIsSessionPaused(false);
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      
      // Update session status to ACTIVE
      try {
        await fetch(`/api/session/${sessionToUse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' })
        });
        console.log('Session started successfully');
        // Refresh sessions list to remove current session from previous sessions
        await refreshSessions();
      } catch (error) {
        console.error('Error updating session status:', error);
      }
      
      // Start timer from current elapsed time
      const interval = setInterval(() => {
        setElapsedTime(prev => {
          const newElapsed = prev + 1;
          const mins = Math.floor(newElapsed / 60);
          const secs = newElapsed % 60;
          setTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          return newElapsed;
        });
      }, 1000);
      
      setTimerInterval(interval);
    }
  };

  const pauseSession = async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsSessionPaused(true);
    // Keep isSessionActive true so we don't show "Start Session" button
    
    // Update session status to PAUSED
    if (currentSession) {
      try {
        await fetch(`/api/session/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED' })
        });
        console.log('Session paused');
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }
  };

  const resumeSession = async () => {
    if (!timerInterval && isSessionActive) {
      setIsSessionPaused(false);
      
      // Restart timer from current elapsed time
      const interval = setInterval(() => {
        setElapsedTime(prev => {
          const newElapsed = prev + 1;
          const mins = Math.floor(newElapsed / 60);
          const secs = newElapsed % 60;
          setTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          return newElapsed;
        });
      }, 1000);
      
      setTimerInterval(interval);
      
      // Update session status to ACTIVE
      if (currentSession) {
        try {
          await fetch(`/api/session/${currentSession.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACTIVE' })
          });
          console.log('Session resumed');
        } catch (error) {
          console.error('Error updating session status:', error);
        }
      }
    }
  };

  const stopSession = async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsSessionActive(false);
    setIsSessionPaused(false);
    setTimer("00:00");
    setSessionStartTime(null);
    setElapsedTime(0); // Reset elapsed time
    
    // Update session status to DRAFT (stopped but not completed)
    if (currentSession) {
      try {
        await fetch(`/api/session/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'DRAFT' })
        });
        console.log('Session stopped');
        // Refresh sessions list to show stopped session in previous sessions
        await refreshSessions();
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Load initial data
  useEffect(() => {
    if (session) {
      const loadInitialData = async () => {
        try {
          setIsLoading(true);
          // Load sessions, action items, goals, and agents
          const [sessionsRes, actionItemsRes, goalsRes, usersRes] = await Promise.all([
            fetch('/api/session'),
            fetch('/api/action-item'),
            fetch('/api/goal'),
            fetch('/api/user')
          ]);
          const sessions = await sessionsRes.json();
          const actionItemsData = await actionItemsRes.json();
          const goalsData = await goalsRes.json();
          const usersData = await usersRes.json();
          
          // Show all sessions (completed, draft, etc.) sorted by most recent first
          const allSessions = sessions
            .filter((s: Session) => s.status !== 'ACTIVE' && s.status !== 'PAUSED') // Don't show currently active sessions
            .sort((a: Session, b: Session) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
          
          setPreviousSessions(allSessions);
          setActionItems(actionItemsData);
          setGoals(goalsData);
          // Only show agents for selection
        setAgents(usersData.filter((u: User) => u.role === 'AGENT'));
        } catch (error) {
          console.error('Error loading initial data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadInitialData();
    }
  }, [session]);

  // Widget drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setWidgetPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!session) {
    return null;
  }

  const createCurrentSession = async () => {
    if (isCreatingSession) {
      console.log('Session creation already in progress');
      return null;
    }
    
    setIsCreatingSession(true);
    try {
      if (!session?.user?.email) {
        console.error('User not authenticated');
        return null;
      }

      // Find the current user by email
      const usersResponse = await fetch('/api/user');
      const users = await usersResponse.json();
      
      const currentUser = users.find((user: User) => user.email === session.user.email);
      
      if (!currentUser) {
        console.error('Current user not found in database');
        return null;
      }

      // Generate session number - simple incremental approach
      const sessionsResponse = await fetch('/api/session');
      const existingSessions = await sessionsResponse.json();
      const userSessions = existingSessions.filter((s: Session) => s.teamLeaderId === currentUser.id);
      const sessionNumber = userSessions.length + 1;

      // Create a new session with the current user
      // For coaching sessions, the current user can be both team leader and agent
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionNumber,
          type: 'SCHEDULED',
          status: 'DRAFT',
          scheduledDate: new Date().toISOString(),
          teamLeaderId: currentUser.id,
          agentId: currentUser.id  // Self-coaching session
        })
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setCurrentSession(newSession);
        console.log('Session created:', newSession);
        // Refresh sessions list to remove new session from previous sessions
        await refreshSessions();
        return newSession; // Return the created session instead of calling startSession
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreatingSession(false);
    }
    return null;
  };

  const addQuickNote = async (note: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const noteWithTimestamp = `[${timestamp}] ${note}\n`;
    setNotes(prev => prev + noteWithTimestamp);
    
    // Save note to database
    if (currentSession) {
      try {
        await fetch('/api/session-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            content: note,
            isQuickNote: true,
            category: 'COACHING_NOTE'
          })
        });
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  const handleActionItemClick = async (item: ActionItem) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date';
    const completedDate = item.completedDate ? new Date(item.completedDate).toLocaleDateString() : 'Not completed';
    
    const detailedNote = `[${timestamp}] ACTION ITEM REVIEWED:
Title: ${item.title}
Description: ${item.description || 'No description'}
Status: ${item.status}
Priority: ${item.priority}
Due Date: ${dueDate}
${item.status === 'COMPLETED' ? `Completed: ${completedDate}` : ''}
Assigned to: ${item.assignedTo?.firstName} ${item.assignedTo?.lastName}
Created by: ${item.createdBy?.firstName} ${item.createdBy?.lastName}
---
`;
    
    setNotes(prev => prev + detailedNote);
    
    // Save note to database
    if (currentSession) {
      try {
        await fetch('/api/session-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            content: detailedNote,
            isQuickNote: true,
            category: 'ACTION_ITEM_REVIEW'
          })
        });
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  const updateActionItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/action-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          ...(newStatus === 'COMPLETED' ? { completedDate: new Date().toISOString() } : {})
        })
      });
      
      if (response.ok) {
        // Reload action items
        const actionItemsResponse = await fetch('/api/action-item');
        const actionItemsData = await actionItemsResponse.json();
        setActionItems(actionItemsData);
        
        await addQuickNote(`Action item "${actionItems.find(item => item.id === itemId)?.title}" status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const deleteActionItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this action item?')) {
      try {
        const response = await fetch(`/api/action-item/${itemId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Reload action items
          const actionItemsResponse = await fetch('/api/action-item');
          const actionItemsData = await actionItemsResponse.json();
          setActionItems(actionItemsData);
          
          await addQuickNote(`Action item deleted`);
        }
      } catch (error) {
        console.error('Error deleting action item:', error);
      }
    }
  };

  const saveSessionNotes = async () => {
    if (currentSession && notes) {
      try {
        setIsSaving(true);
        await fetch('/api/session-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            content: notes,
            isQuickNote: false,
            category: 'SESSION_SUMMARY'
          })
        });
        
        // Log the activity
        await logActivity('create', 'session_note', currentSession.id, {
          noteLength: notes.length,
          isQuickNote: false,
          category: 'SESSION_SUMMARY'
        });
      } catch (error) {
        console.error('Error saving session notes:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Helper function to log activities (visible only to admins)
  const logActivity = async (action: string, entityType: string, entityId: string, changes?: Record<string, unknown>) => {
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entityType,
          entityId,
          changes
        })
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleAgentResponse = async (response: string) => {
    setAgentResponse(response);
    
    // Log the agent response to audit log (admin only)
    if (currentSession) {
      await logActivity('agent_response', 'session', currentSession.id, {
        responseType: response,
        message: response === 'agree' 
          ? 'Agent agrees with the coaching feedback'
          : 'Agent disagrees with some aspects of the feedback'
      });
    }
    
    // Save agent response to database (but don't add to session notes)
    if (currentSession) {
      try {
        await fetch(`/api/session/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentResponseType: response.toUpperCase()
          })
        });
      } catch (error) {
        console.error('Error saving agent response:', error);
      }
    }
  };

  const createActionItem = async (title: string, description: string = '') => {
    try {
      // Get users for default assignment
      const usersResponse = await fetch('/api/user');
      const users = await usersResponse.json();
      
      const teamLeader = users.find((user: User) => user.role === 'TEAM_LEADER');
      const agent = users.find((user: User) => user.role === 'AGENT');
      
      if (!teamLeader || !agent) {
        alert('Error: Required users not found. Please contact admin.');
        return;
      }

      const response = await fetch('/api/action-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          sessionId: currentSession?.id || null, // Can be null for general action items
          createdById: teamLeader.id,
          assignedToId: agent.id,
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
      });
      
      if (response.ok) {
        const newActionItem = await response.json();
        setActionItems(prev => [...prev, newActionItem]);
        await addQuickNote(`New action item created: ${title}`);
        
        // Show success feedback
        alert(`Action item "${title}" created successfully!`);
      } else {
        const errorData = await response.json();
        console.error('Error creating action item:', errorData);
        alert('Error creating action item. Please try again.');
      }
    } catch (error) {
      console.error('Error creating action item:', error);
      alert('Error creating action item. Please check your connection and try again.');
    }
  };

  const handleCreateActionItem = async () => {
    if (!newActionItem.title.trim()) {
      alert('Please enter a title for the action item.');
      return;
    }
    
    await createActionItem(newActionItem.title, newActionItem.description);
    setNewActionItem({ title: '', description: '' });
    setShowActionItemForm(false);
  };

  const completeSession = async () => {
    if (!currentSession) {
      alert('No active session to complete!');
      return;
    }

    try {
      setIsSaving(true);
      
      // Save final notes first
      if (notes.trim()) {
        await saveSessionNotes();
      }
      
      // Calculate duration properly
      const timeParts = timer.split(':');
      const minutes = parseInt(timeParts[0]) || 0;
      const seconds = parseInt(timeParts[1]) || 0;
      const totalMinutes = minutes + (seconds / 60);
      
      // Update session status to completed
      const updateResponse = await fetch(`/api/session/${currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          actualDate: new Date().toISOString(),
          duration: Math.round(totalMinutes)
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update session status');
      }
      
      // Add completion note
      await addQuickNote('Session completed successfully');
      
      // Stop the timer
      await stopSession();
      
      // Clear current session since it's now completed
      setCurrentSession(null);
      setNotes(''); // Clear notes for next session
      setRatings({}); // Clear ratings for next session
      
      // Refresh data to show completed session in previous sessions
      const loadInitialData = async () => {
        try {
          const [sessionsRes, goalsRes, actionItemsRes] = await Promise.all([
            fetch('/api/session'),
            fetch('/api/goal'),
            fetch('/api/action-item')
          ]);
          
          const [sessionsData, goalsData, actionItemsData] = await Promise.all([
            sessionsRes.json(),
            goalsRes.json(),
            actionItemsRes.json()
          ]);
          
          // Show all sessions (completed, draft, etc.) sorted by most recent first
          const allSessions = sessionsData
            .filter((s: Session) => s.status !== 'ACTIVE' && s.status !== 'PAUSED') // Don't show currently active sessions
            .sort((a: Session, b: Session) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
          
          setPreviousSessions(allSessions);
          setGoals(goalsData);
          setActionItems(actionItemsData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      
      await loadInitialData();
      
      alert('Session completed successfully!');
      
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to complete session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Previous session management functions
  const deletePreviousSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setPreviousSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // Log the activity
        await logActivity('delete', 'session', sessionId, {
          reason: 'User deleted previous session'
        });
        
        alert('Session deleted successfully');
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const viewPreviousSession = (session: Session) => {
    setSelectedPreviousSession(session);
    setShowSessionModal(true);
  };

  // Add missing tab switch handler
  const handleTabSwitch = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Add missing handleRating function for evaluation tab
  const handleRating = (criteria: string, rating: number) => {
    setRatings(prev => ({ ...prev, [criteria]: rating }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-2xl">
        {/* Background with gradient and effects */}
        <div className="relative bg-gradient-to-r from-[#00C4B3] via-[#00D4C7] to-[#00E6DC] overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-300 via-emerald-300 to-teal-200"></div>
          
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
          
          {/* Main header content */}
          <div className="relative max-w-full mx-auto px-8 py-4">
            <div className="flex justify-between items-center gap-4">
              
              {/* Left Section - Brand */}
              <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
                {/* Logo */}
                <div className="bg-white/20 rounded-xl p-2 shadow-lg border border-white/30 backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                
                {/* Brand */}
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black text-white drop-shadow-lg tracking-tight">
                    Coaching Hub
                  </h1>
                  <p className="text-white/70 text-xs font-medium">Performance Excellence Platform</p>
                </div>
              </div>

              {/* Center Section - User Info */}
              <div className="flex items-center gap-6 flex-1 justify-center">
                
                {/* User Profile Card */}
                {session?.user && (
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/30 shadow-lg">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/40">
                        <span className="text-white font-bold text-sm">
                          {session.user.firstName?.[0] || session.user.name?.[0]}{session.user.lastName?.[0] || session.user.name?.split(' ')[1]?.[0]}
                        </span>
                      </div>
                      
                      {/* User Details */}
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-sm leading-tight">
                          {session.user.name || `${session.user.firstName} ${session.user.lastName}`}
                        </span>
                        <span className="text-white/70 text-xs">
                          {session.user.email}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-white bg-white/20 rounded-full border border-white/30">
                          <div className="w-1.5 h-1.5 bg-green-300 rounded-full mr-1.5 animate-pulse"></div>
                          {session.user.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent Selection for Supervisors */}
                {session?.user && (session.user.role === 'TEAM_LEADER' || session.user.role === 'ADMIN' || session.user.role === 'MANAGER') && (
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/30 shadow-lg min-w-[180px]">
                    <label className="block text-white/80 text-xs font-bold uppercase tracking-wide mb-2">Agent Selection</label>
                    <select
                      value={selectedAgentId}
                      onChange={e => setSelectedAgentId(e.target.value)}
                      title="Select Agent to Coach"
                      className="w-full bg-white/20 backdrop-blur-sm border border-white/40 text-white rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/60 transition-all"
                    >
                      <option value="" className="bg-gray-800 text-white">-- Select Agent --</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id} className="bg-gray-800 text-white">
                          {agent.firstName} {agent.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Right Section - Controls */}
              <div className="flex items-center gap-4 flex-shrink-0">
                
                {/* Timer Display */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/30 shadow-lg">
                  <div className="flex flex-col items-center">
                    <span className="text-white/80 text-xs font-bold uppercase tracking-wide mb-1">Session Timer</span>
                    <div className="text-2xl font-black text-white bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 font-mono tracking-wide shadow-inner">
                      {timer}
                    </div>
                  </div>
                </div>
                
                {/* Session Controls */}
                <div className="flex flex-col gap-2">
                  {!isSessionActive ? (
                    <button
                      onClick={startSession}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20"
                    >
                      🚀 Start Session
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      {isSessionPaused ? (
                        <button
                          onClick={resumeSession}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20 text-sm"
                        >
                          ▶️ Resume
                        </button>
                      ) : (
                        <button
                          onClick={pauseSession}
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20 text-sm"
                        >
                          ⏸️ Pause
                        </button>
                      )}
                      <button
                        onClick={stopSession}
                        className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20 text-sm"
                      >
                        ⏹️ Stop
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {/* Admin Panel Button */}
                  {session?.user?.role === 'ADMIN' && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20 text-sm"
                    >
                      ⚙️ Admin
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => signOut()}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20 text-sm"
                    >
                      🚪 Sign Out
                    </button>
                    <button
                      onClick={() => router.push('/settings')}
                      className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-white/20 text-sm"
                    >
                      ⚙️ Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/20 via-white/40 to-white/20"></div>
        </div>
      </header>

      {/* Live Session Widget - Compact draggable widget for team leaders */}
      {currentSession && isSessionActive && (
        <div 
          className="fixed z-40 select-none"
          style={{
            left: `${widgetPosition.x}px`,
            top: `${widgetPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="bg-gradient-to-b from-[#00C4B3] to-[#00B4A3] rounded-2xl p-4 shadow-2xl border border-white/30 backdrop-blur-lg w-72 transform hover:scale-105 transition-transform duration-200">
            {/* Widget Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-ping absolute"></div>
                  <div className="w-3 h-3 bg-red-500 rounded-full relative z-10"></div>
                </div>
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Live Session</h3>
              </div>
              <div className="text-white font-black text-xl">
                #{currentSession.sessionNumber}
              </div>
            </div>

            {/* Timer Display */}
            <div className="bg-white/15 rounded-lg p-3 mb-4 text-center">
              <div className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Duration</div>
              <div className="text-2xl font-black text-white font-mono tracking-wider">
                {timer}
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-white/70 text-xs font-medium uppercase tracking-wide">Status</div>
                <div className={`text-sm font-bold ${
                  currentSession.status === 'ACTIVE' ? 'text-green-300' :
                  currentSession.status === 'PAUSED' ? 'text-yellow-300' :
                  'text-white'
                }`}>
                  {currentSession.status}
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-white/70 text-xs font-medium uppercase tracking-wide">Type</div>
                <div className="text-white font-bold text-sm">
                  {currentSession.type?.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Agent Info (if selected) */}
            {selectedAgentId && (
              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <div className="text-white/70 text-xs font-medium uppercase tracking-wide mb-2">Agent</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                    <span className="text-white text-xs font-bold">
                      {agents.find(a => a.id === selectedAgentId)?.firstName?.[0]}{agents.find(a => a.id === selectedAgentId)?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">
                      {agents.find(a => a.id === selectedAgentId)?.firstName} {agents.find(a => a.id === selectedAgentId)?.lastName}
                    </div>
                    <div className="text-white/60 text-xs truncate">
                      {agents.find(a => a.id === selectedAgentId)?.email}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Items Summary */}
            <div className="bg-white/10 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Action Items</span>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {actionItems.length}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center bg-yellow-500/20 rounded-md p-2">
                  <div className="text-yellow-300 font-bold text-lg">
                    {actionItems.filter(item => item.status === 'PENDING').length}
                  </div>
                  <div className="text-white/70 text-xs">Pending</div>
                </div>
                <div className="text-center bg-blue-500/20 rounded-md p-2">
                  <div className="text-blue-300 font-bold text-lg">
                    {actionItems.filter(item => item.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="text-white/70 text-xs">Progress</div>
                </div>
                <div className="text-center bg-green-500/20 rounded-md p-2">
                  <div className="text-green-300 font-bold text-lg">
                    {actionItems.filter(item => item.status === 'COMPLETED').length}
                  </div>
                  <div className="text-white/70 text-xs">Done</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{goals.length}</div>
                <div className="text-white/70 text-xs">Goals</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">
                  {currentSession.overallScore || '--'}
                </div>
                <div className="text-white/70 text-xs">Score</div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                {isSessionPaused ? (
                  <button
                    onClick={resumeSession}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 px-3 rounded-lg font-semibold text-xs shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    ▶️ Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseSession}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-2 px-3 rounded-lg font-semibold text-xs shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    ⏸️ Pause
                  </button>
                )}
                
                <button
                  onClick={stopSession}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 px-3 rounded-lg font-semibold text-xs shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  ⏹️ End
                </button>
              </div>
            </div>

            {/* Drag indicator */}
            <div className="flex justify-center mt-3">
              <div className="w-8 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-none mx-auto p-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-140px)]">
          {/* Previous Sessions Column */}
          <div className="col-span-3 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-full border border-[#00C4B3]/20">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Previous Sessions
              </h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">{previousSessions.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Session Cards */}
              {previousSessions.map((session: Session, index: number) => (
                <div 
                  key={session.id}
                  className="w-full mb-3 bg-gradient-to-br from-white via-gray-50 to-blue-50 border border-[#00C4B3]/20 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-[#00C4B3]/40 transform hover:-translate-y-1" 
                  onClick={() => viewPreviousSession(session)}
                >
                  {/* Header with Session Number and Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#00C4B3] to-[#00B4A3] rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-sm">#{session.sessionNumber || index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-800 mb-1">
                          Coaching Session
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            session.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                            session.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                            session.status === 'PAUSED' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {session.status}
                          </span>
                          {session.type && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {session.type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Overall Score */}
                      {session.status === 'COMPLETED' && session.overallScore && (
                        <div className="bg-white rounded-md px-2 py-1 shadow-sm border text-center">
                          <div className="text-sm font-bold text-[#00C4B3]">{session.overallScore}</div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                      )}
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreviousSession(session.id);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-all"
                        title="Delete session"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M9 10v10a2 2 0 002 2h2a2 2 0 002-2V10M9 10H7a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white rounded-md p-2 text-center shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Duration</div>
                      <div className="text-sm font-bold text-gray-800">
                        {session.duration ? `${session.duration}m` : '--'}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-md p-2 text-center shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Actions</div>
                      <div className="text-sm font-bold text-blue-600">
                        {actionItems.filter(item => item.sessionId === session.id).length}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-md p-2 text-center shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Done</div>
                      <div className="text-sm font-bold text-green-600">
                        {actionItems.filter(item => item.sessionId === session.id && item.status === 'COMPLETED').length}
                      </div>
                    </div>
                  </div>

                  {/* Key Topics/Areas Covered */}
                  <div className="bg-white/70 rounded-md p-2 mb-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Focus Areas</div>
                    <div className="flex flex-wrap gap-1">
                      {/* Sample focus areas - in real implementation, these would come from session data */}
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Communication</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Problem Solving</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">Customer Focus</span>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  {session.status === 'COMPLETED' && (
                    <div className="bg-white/70 rounded-md p-2 mb-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Performance Ratings</div>
                      <div className="space-y-1">
                        {[
                          { label: 'Communication', score: 4 },
                          { label: 'Technical Skills', score: 3 },
                          { label: 'Customer Focus', score: 5 }
                        ].map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">{metric.label}</span>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= metric.score ? 'bg-[#00C4B3]' : 'bg-gray-200'}`}></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items Preview */}
                  {actionItems.filter(item => item.sessionId === session.id).slice(0, 2).length > 0 && (
                    <div className="bg-white/70 rounded-md p-2 mb-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Recent Action Items</div>
                      <div className="space-y-1">
                        {actionItems.filter(item => item.sessionId === session.id).slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'COMPLETED' ? 'bg-green-500' :
                              item.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}></div>
                            <span className="text-xs text-gray-700 flex-1 truncate">{item.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              item.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.status === 'COMPLETED' ? 'Done' : 
                               item.status === 'IN_PROGRESS' ? 'Progress' : 'Pending'}
                            </span>
                          </div>
                        ))}
                        {actionItems.filter(item => item.sessionId === session.id).length > 2 && (
                          <div className="text-xs text-gray-500 italic">
                            +{actionItems.filter(item => item.sessionId === session.id).length - 2} more items...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer with Date and Time */}
                  <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-200 pt-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(session.scheduledDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      Click to view
                    </span>
                  </div>
                </div>
              ))}
              
              {previousSessions.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 py-8">
                  <p>No previous sessions found</p>
                </div>
              )}
              
              {isLoading && (
                <div className="text-center text-gray-500 py-8">
                  <p>Loading sessions...</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Session Area */}
          <div className="col-span-6 flex flex-col gap-4 h-full min-h-0">
            {/* Agent Header and Metrics for Team Leader, Admin, and Manager with agent selected */}
            {(session.user?.role === 'TEAM_LEADER' || session.user?.role === 'ADMIN' || session.user?.role === 'MANAGER') && selectedAgentId && (
              <div className="bg-white rounded-xl shadow p-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {/* Initials */}
                      {(() => {
                        const agent = agents.find(a => a.id === selectedAgentId);
                        if (!agent) return "";
                        return `${agent.firstName[0] || ''}${agent.lastName[0] || ''}`;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {(() => {
                          const agent = agents.find(a => a.id === selectedAgentId);
                          if (!agent) return "";
                          return `${agent.firstName} ${agent.lastName}`;
                        })()}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {/* Department and tenure if available */}
                        {(() => {
                          const agent = agents.find(a => a.id === selectedAgentId);
                          if (!agent) return "";
                          return `${(agent.department ?? '')}${agent.tenure ? ` • ${agent.tenure}` : ''}`;
                        })()}
                      </p>
                    </div>
                  </div>
                  {/* Key Metrics and Agent Rating */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-medium">CSAT Score</span>
                      <span className="font-bold text-indigo-600 text-lg">4.8</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-medium">First Call Resolution</span>
                      <span className="font-bold text-green-600 text-lg">87%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-medium">Avg Handle Time</span>
                      <span className="font-bold text-blue-600 text-lg">5:30</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-medium">Quality Score</span>
                      <span className="font-bold text-purple-600 text-lg">92%</span>
                    </div>
                  </div>
                  {/* Agent Rating Stars */}
                  <div className="flex items-center ml-8">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`w-5 h-5 rounded-full ${i <= 4 ? 'bg-indigo-500' : 'bg-gray-300'} mr-1`}></span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Session Content */}
            <div className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'notes', label: 'Session Notes', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN'] },
                  { id: 'evaluation', label: 'Evaluation', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN'] },
                  { id: 'goals', label: 'Goals & Actions', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN', 'AGENT'] },
                  { id: 'templates', label: 'Templates', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN'] }
                ].filter(tab => tab.roles.includes(session.user?.role || '')).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id)}
                    className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id 
                        ? 'text-indigo-600 border-indigo-600' 
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                {activeTab === 'notes' && (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 mb-4">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full h-full min-h-[200px] p-4 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                        placeholder="Enter your coaching notes here. Be specific about behaviors observed, feedback provided, and agent responses..."
                      />
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Quick Add Notes:</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'Great active listening',
                          'Needs work on empathy', 
                          'Excellent product knowledge',
                          'Good problem solving'
                        ].map(note => (
                          <button
                            key={note}
                            onClick={() => addQuickNote(note)}
                            className="px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'evaluation' && (
                  <div className="space-y-4">
                    {[
                      'Communication Skills',
                      'Technical Knowledge', 
                      'Problem Solving',
                      'Customer Focus',
                      'Process Compliance'
                    ].map(criteria => (
                      <div key={criteria} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium text-gray-700 text-base">{criteria}</span>
                          <p className="text-sm text-gray-500 mt-1">Rate this aspect of the agent&apos;s performance</p>
                        </div>
                        <div className="rating-stars ml-4">
                          {[1,2,3,4,5].map(rating => (
                            <svg
                              key={rating}
                              onClick={() => handleRating(criteria, rating)}
                              className={`star ${ratings[criteria] >= rating ? 'filled' : ''}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-4 text-gray-800">Current Goals</h4>
                      {goals.length > 0 ? (
                        goals.slice(0, 3).map((goal: Goal) => (
                          <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-3">
                            <h5 className="font-semibold text-sm mb-2 text-gray-800">{goal.title}</h5>
                            <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-medium text-gray-800">{calculateProgress(goal)}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full">
                                <div 
                                  className={`h-full bg-indigo-600 rounded-full transition-all duration-300 progress-bar-${Math.round(calculateProgress(goal) / 10) * 10}`}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h5 className="font-semibold text-sm mb-2 text-gray-800">Improve First Call Resolution</h5>
                          <p className="text-sm text-gray-600 mb-3">Target: Achieve 85% FCR by end of quarter</p>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium text-gray-800">78%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div className="h-full w-3/4 bg-indigo-600 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-4 text-gray-800">Action Items</h4>
                      <button 
                        onClick={() => createActionItem('New action item', 'Created from main session')}
                        className="w-full p-4 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add new action item
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'templates' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Performance Review', desc: 'Comprehensive performance evaluation template' },
                      { name: 'Skills Development', desc: 'Focus on skill improvement and training needs' },
                      { name: 'Incident Review', desc: 'Review specific customer incidents or complaints' },
                      { name: 'Goal Setting', desc: 'Set and track performance goals' }
                    ].map(template => (
                      <button
                        key={template.name}
                        onClick={() => addQuickNote(`Used ${template.name} template`)}
                        className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                      >
                        <h4 className="font-semibold text-sm mb-2 text-gray-800 group-hover:text-indigo-700">{template.name}</h4>
                        <p className="text-sm text-gray-600 group-hover:text-indigo-600">{template.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Agent Response:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAgentResponse('agree')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        agentResponse === 'agree' 
                          ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                          : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Agrees
                    </button>
                    <button
                      onClick={() => handleAgentResponse('disagree')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        agentResponse === 'disagree' 
                          ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                          : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Disagrees
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={saveSessionNotes}
                    disabled={isSaving}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button 
                    onClick={completeSession}
                    disabled={isSaving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Completing...' : 'Complete Session'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Items Column */}
          <div className="col-span-3 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-full border border-[#00C4B3]/20">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Action Items
              </h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">5</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {actionItems.slice(0, 5).map((item: ActionItem) => (
                <div key={item.id} className="mb-4 bg-white border border-[#00C4B3]/10 rounded-xl p-5 shadow-lg hover:shadow-2xl transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm text-gray-800">{item.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status === 'PENDING' ? 'Due Soon' : 
                       item.status === 'COMPLETED' ? 'Completed' :
                       item.status === 'IN_PROGRESS' ? 'In Progress' :
                       item.status === 'OVERDUE' ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{item.description || 'No description'}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mb-3">
                    <span>Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}</span>
                    <span>{item.priority} Priority</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleActionItemClick(item)}
                      className="flex-1 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                    >
                      📝 Review Details
                    </button>
                    {item.status !== 'COMPLETED' && (
                      <button
                        onClick={() => updateActionItemStatus(item.id, 'COMPLETED')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        ✓ Complete
                      </button>
                    )}
                    {item.status !== 'IN_PROGRESS' && item.status !== 'COMPLETED' && (
                      <button
                        onClick={() => updateActionItemStatus(item.id, 'IN_PROGRESS')}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        🔄 Start
                      </button>
                    )}
                    <button
                      onClick={() => deleteActionItem(item.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}

              {actionItems.length === 0 && !isLoading && (
                <>
                  <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm mb-2 text-gray-800">Complete empathy training</h4>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Due Soon</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Enroll in advanced customer empathy course</p>
                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                      <span>Due: Jan 20</span>
                      <span>High Priority</span>
                    </div>
                    <button 
                      onClick={() => createActionItem('Complete empathy training', 'Enroll in advanced customer empathy course')}
                      className="w-full px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                    >
                      Create This Action Item
                    </button>
                  </div>

                  <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm mb-2 text-gray-800">Shadow senior agent</h4>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">Pending</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">2 hours with Alex Thompson on complex calls</p>
                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                      <span>Due: Jan 25</span>
                      <span>Medium Priority</span>
                    </div>
                    <button 
                      onClick={() => createActionItem('Shadow senior agent', '2 hours with Alex Thompson on complex calls')}
                      className="w-full px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                    >
                      Create This Action Item
                    </button>
                  </div>
                </>
              )}

              {/* Add Action Item Form */}
              {showActionItemForm ? (
                <div className="border-2 border-indigo-300 rounded-lg p-4 mt-2">
                  <h5 className="font-medium text-gray-700 mb-3">Create New Action Item</h5>
                  <input
                    type="text"
                    placeholder="Action item title..."
                    value={newActionItem.title}
                    onChange={(e) => setNewActionItem(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <textarea
                    placeholder="Description (optional)..."
                    value={newActionItem.description}
                    onChange={(e) => setNewActionItem(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg mb-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateActionItem}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowActionItemForm(false);
                        setNewActionItem({ title: '', description: '' });
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowActionItemForm(true)}
                  className="w-full p-4 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add new action item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Previous Session Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                title="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-gray-500 mb-4">March 5, 2024 • 32 minutes</p>
              <h4 className="font-semibold mb-4">Focus: Call handling efficiency</h4>
              <p className="text-gray-700 leading-relaxed mb-6">
                Michael showed significant improvement in call handling. Average handle time reduced by 15%. 
                Still needs to work on maintaining quality while improving speed.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-green-600 mb-2">Strengths</h5>
                  <ul className="space-y-1">
                    <li>✓ Time management</li>
                    <li>✓ System navigation</li>
                    <li>✓ Customer rapport</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-amber-600 mb-2">Areas for Improvement</h5>
                  <ul className="space-y-1">
                    <li>• Active listening</li>
                    <li>• Closing techniques</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Session Detail Modal */}
      {showSessionModal && selectedPreviousSession && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00C4B3] to-[#00B4A3] px-4 py-3 text-white relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold">#{selectedPreviousSession.sessionNumber}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Session Details</h2>
                    <p className="text-white/80 text-xs">
                      {new Date(selectedPreviousSession.scheduledDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
                  title="Close modal"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 text-center border border-blue-200">
                  <div className="text-lg font-bold text-blue-600 mb-1">
                    {selectedPreviousSession.duration || '--'}
                  </div>
                  <div className="text-xs font-medium text-blue-700">Duration (min)</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 text-center border border-green-200">
                  <div className="text-lg font-bold text-green-600 mb-1">
                    {selectedPreviousSession.overallScore || '--'}
                  </div>
                  <div className="text-xs font-medium text-green-700">Score</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 text-center border border-purple-200">
                  <div className="text-lg font-bold text-purple-600 mb-1">
                    {actionItems.filter(item => item.sessionId === selectedPreviousSession.id).length}
                  </div>
                  <div className="text-xs font-medium text-purple-700">Actions</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 text-center border border-orange-200">
                  <div className="text-lg font-bold text-orange-600 mb-1">
                    {actionItems.filter(item => item.sessionId === selectedPreviousSession.id && item.status === 'COMPLETED').length}
                  </div>
                  <div className="text-xs font-medium text-orange-700">Done</div>
                </div>
              </div>

              {/* Session Info and Performance Side by Side */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Session Info</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedPreviousSession.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          selectedPreviousSession.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedPreviousSession.status}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-600">Type</label>
                      <p className="text-gray-900 text-sm mt-1">{selectedPreviousSession.type?.replace('_', ' ')}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-600">Time</label>
                      <p className="text-gray-900 text-sm mt-1">
                        {new Date(selectedPreviousSession.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Ratings */}
                {selectedPreviousSession.status === 'COMPLETED' && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Performance</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Communication', score: 4 },
                        { label: 'Technical', score: 3 },
                        { label: 'Problem Solving', score: 5 },
                        { label: 'Customer Focus', score: 4 }
                      ].map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{metric.label}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i <= metric.score ? 'bg-[#00C4B3]' : 'bg-gray-200'}`}></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Session Summary */}
              {selectedPreviousSession.summary && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Session Summary</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{selectedPreviousSession.summary}</p>
                </div>
              )}

              {/* Action Items */}
              {actionItems.filter(item => item.sessionId === selectedPreviousSession.id).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Action Items</h3>
                  <div className="space-y-2">
                    {actionItems.filter(item => item.sessionId === selectedPreviousSession.id).map((item, idx) => (
                      <div key={idx} className="bg-white rounded-md p-3 border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            item.status === 'COMPLETED' ? 'bg-green-500' :
                            item.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}></div>
                          <div>
                            <h4 className="font-medium text-gray-800 text-sm">{item.title}</h4>
                            {item.description && (
                              <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>Priority: {item.priority}</span>
                              {item.dueDate && (
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status === 'COMPLETED' ? 'Done' : 
                           item.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {/* Sample focus areas - in real implementation, these would come from session data */}
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Communication</span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Problem Solving</span>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">Customer Focus</span>
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">Technical Skills</span>
                  <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium">Process Compliance</span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => setShowSessionModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
                    deletePreviousSession(selectedPreviousSession.id);
                    setShowSessionModal(false);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-all"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
