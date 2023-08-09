import Head from "next/head";
import { RouterOutputs, api } from "~/utils/api";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { LoadingSpinner, LoadingPage } from "~/components/loading"
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { type NextPage } from "next";
import Image from "next/image";

dayjs.extend(relativeTime);

const CreatePostWizard = () => {
  const {user} = useUser();
  console.log(user);
  if(!user) return null;

  return (
    <div className="flex gap-3 w-full">
      <img 
        src={user.profileImageUrl} 
        alt="Profile Image" 
        className="w-14 h-14 rounded-full"
        width={56}
        height={56}
      />
      <input 
        placeholder="Type some emojis!"
        className="bg-transparent grow outline-none"/>
    </div>
  );
};

type PostWithUser = RouterOutputs["posts"]["getAll"][number];
const PostView = (props: PostWithUser) => {
  const {post, author} = props;
  return (
    <div key={post.id} className="flex p-4 gap-3 border-b border-slate-400">
      <Image 
        src={author.profileImageUrl}
        className="w-14 h-14 rounded-full"
        alt={`@${author.username}'s profile picture`}
        width={56}
        height={56}
      />
      <div className="flex flex-col"> 
        <div className="flex text-slate-300">
          <span>
            {`@${author.username}`}
            <span className="font-thin">{` · ${dayjs(post.createdAt).fromNow()}`}</span>
          </span>
        </div>
        <span className="text-xl">{post.content}</span>
      </div>
    </div>
  );
};

const Feed = () => {
  const { data, isLoading: postsLoading } = api.posts.getAll.useQuery();

  if(postsLoading) return <LoadingPage/>
  if(!data) return <div> Something went wrong</div>

  return (
    <div className="flex flex-col">
      {[...data, ...data]?.map((fullPost) => (
        <PostView {...fullPost} key = {fullPost.post.id}/>
      ))}
    </div>
  )
};

export default function Home () {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // Start fetching data ASAP
  api.posts.getAll.useQuery();

  // Return empty div if user isn't loaded yet
  if(!userLoaded) return <div />

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex justify-center h-screen">
        <div className = "h-full w-full md:max-w-2xl border-x border-slate-400">
          <div className = "border-b border-slate-400 p-4">
            {!isSignedIn && (
              <div className="flex justify-center">
                <SignInButton/>
              </div>
            )}
            {isSignedIn && <CreatePostWizard/>}
          </div>

          <Feed />
        </div>
      </main>
    </>
  );
}
