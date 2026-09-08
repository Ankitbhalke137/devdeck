import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Standard Google OAuth
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    // Developer Demo / Fast-test provider for instant Google-style login
    Credentials({
      id: "google-demo",
      name: "Google (Demo Account)",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        return {
          id: "google-demo-user-1",
          name: (credentials?.name as string) || "Alex Developer",
          email: (credentials?.email as string) || "alex.dev@googlemail.com",
          image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // Allow Auth.js to trust the request host, so logins work on localhost,
  // LAN IPs and preview URLs in development without host mismatches.
  trustHost: true,
  pages: {
    signIn: "/",
  },
});
