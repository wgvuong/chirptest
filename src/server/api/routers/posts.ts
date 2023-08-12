import { z } from "zod"
import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import type { User } from "@clerk/nextjs/api"

const filterUserForClient = (user: User) => {
  return {id: user.id, 
    username: user.username, 
    profileImageUrl: user.profileImageUrl 
  };
};

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"), // 3 requests per 1 minute
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */ 
  prefix: "@upstash/ratelimit",
});

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [
        {createdAt: "desc"}
      ]
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
  // z.object references zod which checks if the input is an emoji
  create: privateProcedure
    .input(
      z.object({
        content: z.string().emoji("Only emojis are allowed!").min(1).max(280),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const authorId = ctx.userId;

    const { success } = await ratelimit.limit(authorId); // adds a tick in the ratelimit checker
    if(!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS"}); // throws an error when the users tries to input too many requests
    
    const post = await ctx.prisma.post.create( {
      data: {
        authorId,
        content: input.content,
      },
    });

    return post;
  }),
});
