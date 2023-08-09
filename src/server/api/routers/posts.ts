import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import type { User } from "@clerk/nextjs/api"

const filterUserForClient = (user: User) => {
  return {id: user.id, 
    username: user.username, 
    profileImageUrl: user.profileImageUrl 
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
    });

    const users = (
      await clerkClient.users.getUserList({
        userId: posts.map((post) => post.authorId),
        limit: 100,
      })
    ).map(filterUserForClient);
    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);
      if(!author || !author.username) //fix reference to User from clerk
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR", 
          message: "Author for post not found."
        });
      return {
        post,
        author: {
          ...author,
          username: author.username,
        }
      }
    });
  }),
});
