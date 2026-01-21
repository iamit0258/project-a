export default async function handler(req: any, res: any) {
    try {
        // Dynamic import to catch potential top-level crashes in server/index.ts
        const { app, setupPromise } = await import("../server/index");

        // Ensure routes and middleware are registered before handling request
        await setupPromise;

        // Pass the request to the express app
        return app(req, res);
    } catch (error: any) {
        console.error("Vercel Cold Start Error:", error);
        res.status(500).json({
            message: "Server failed to load (Cold Start Error)",
            error: error.message,
            stack: error.stack
        });
    }
}
