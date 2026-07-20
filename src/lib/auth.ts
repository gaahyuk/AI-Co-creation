import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isKakaoConfigured, isNaverConfigured } from "@/lib/social-providers";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(isKakaoConfigured()
      ? [Kakao({ clientId: process.env.KAKAO_CLIENT_ID, clientSecret: process.env.KAKAO_CLIENT_SECRET })]
      : []),
    ...(isNaverConfigured()
      ? [Naver({ clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      if (!account || (account.provider !== "kakao" && account.provider !== "naver")) {
        return true;
      }

      const provider = account.provider;
      const providerId = account.providerAccountId;
      const email = user.email ?? null;

      let dbUser = await prisma.user.findFirst({ where: { provider, providerId } });
      if (!dbUser && email) {
        dbUser = await prisma.user.findUnique({ where: { email } });
      }
      if (!dbUser) {
        dbUser = await prisma.user.create({ data: { email, provider, providerId } });
      }
      user.id = dbUser.id;
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
