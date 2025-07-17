import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      department?: string
      firstName: string
      lastName: string
    } & DefaultSession["user"]
  }
}
