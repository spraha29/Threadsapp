import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { fetchUser } from "@/lib/actions/user.actions";
import AccountProfile from "@/components/forms/AccountProfile";

// Timeout wrapper for async operations
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    
    try {
        return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
        console.error(`${operation} failed:`, error);
        throw error;
    }
};

async function Page() {
    try {
        // Add timeout to currentUser call
        console.log("Fetching current user...");
        const user = await withTimeout(
            currentUser(), 
            4000, // 4 second timeout for auth
            "CurrentUser fetch"
        );
        
        if (!user) {
            console.log("No user found, redirecting...");
            return null;
        }

        console.log("User found, fetching user info...", user.id);
        
        // Add timeout to database call
        const userInfo = await withTimeout(
            fetchUser(user.id),
            5000, // 5 second timeout for database
            "FetchUser database query"
        );
        
        console.log("User info fetched successfully");
        
        if (userInfo?.onboarded) {
            console.log("User already onboarded, redirecting...");
            redirect("/");
        }

        const userData = {
            id: user?.id,
            objectId: userInfo?._id,
            username: userInfo?.username || user?.username,
            name: userInfo?.name || user.firstName || "",
            bio: userInfo?.bio || "",
            image: userInfo?.image || user?.imageUrl,
        };

        return (
            <main className="mx-auto flex max-w-3xl flex-col justify-start px-10 py-20">
                <h1 className="head-text">Onboarding</h1>
                <p className="mt-3 text-base-regular text-light-2">
                    Complete your profile now to use Threads
                </p>
                <section className="bt-9 bg-dark-2 p-10">
                    <AccountProfile user={userData} btnTitle="Continue"/>
                </section>
            </main>
        );
    } catch (error) {
        console.error("Onboarding page error:", error);
        
        // Return error page instead of timing out
        return (
            <main className="mx-auto flex max-w-3xl flex-col justify-start px-10 py-20">
                <h1 className="head-text">Connection Error</h1>
                <p className="mt-3 text-base-regular text-light-2">
                    Something went wrong. Please refresh the page or try again later.
                </p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 bg-primary-500 px-4 py-2 rounded text-white"
                >
                    Refresh Page
                </button>
            </main>
        );
    }
}

export default Page;
