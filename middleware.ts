import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    
    // Admin routes protection
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!token?.role || (token.role !== "ADMIN" && token.role !== "MANAGER")) {
        return new Response("Forbidden", { status: 403 });
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page
        if (req.nextUrl.pathname === "/login") {
          return true
        }
        
        // Require authentication for all other pages
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
