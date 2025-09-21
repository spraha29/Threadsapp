import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs";
 
const f = createUploadthing();
 
// Add timeout wrapper for currentUser to prevent timeouts
const getUserWithTimeout = async (timeoutMs = 5000) => {
  const timeoutPromise = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error('User fetch timeout')), timeoutMs)
  );
  
  try {
    const userPromise = currentUser();
    const result = await Promise.race([userPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.log("User fetch timed out or failed:", error);
    throw new Error("Authentication timeout - please try again");
  }
};
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  media : f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      console.log("Starting user authentication...");
      
      const user = await getUserWithTimeout(5000); // 5 second timeout
 
      // If you throw, the user will not be able to upload
      if (!user || !user.id) {
        throw new Error("Unauthorized - user not found");
      }

      console.log("User authenticated successfully:", user.id);
 
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      // You can add additional processing here if needed
      // For example: save file info to database
      
      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
