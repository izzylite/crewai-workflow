import { z } from "zod";
import { Browserbase } from "@browserbasehq/sdk";
import type { Tool, ToolSchema, ToolResult } from "./tool.js";
import type { Context } from "../context.js";
import type { ToolActionResult } from "../types/types.js";

const NavigateInputSchema = z.object({
  url: z.string().describe("The URL to navigate to"),
});

type NavigateInput = z.infer<typeof NavigateInputSchema>;

const navigateSchema: ToolSchema<typeof NavigateInputSchema> = {
  name: "browserbase_stagehand_navigate",
  description:
    "Navigate to a URL in the browser. Only use this tool with URLs you're confident will work and stay up to date. Otherwise, use https://google.com as the starting point",
  inputSchema: NavigateInputSchema,
};

async function handleNavigate(
  context: Context,
  params: NavigateInput,
): Promise<ToolResult> {
  const action = async (): Promise<ToolActionResult> => {
    try {
      const stagehand = await context.getStagehand();
      const page = await context.getActivePage();

      if (!page) {
        throw new Error("No active page available");
      }
      await page.goto(params.url, { waitUntil: "domcontentloaded" });

      const sessionId = stagehand.browserbaseSessionID;
      if (!sessionId) {
        throw new Error("No Browserbase session ID available");
      }

      // Get the debug URL using Browserbase SDK
      const bb = new Browserbase({
        apiKey: context.config.browserbaseApiKey,
      });
      const debugUrl = (await bb.sessions.debug(sessionId))
        .debuggerFullscreenUrl;

      return {
        content: [
          {
            type: "text",
            text: `Navigated to: ${params.url}`,
          },
          {
            type: "text",
            text: `View the live session here: https://www.browserbase.com/sessions/${sessionId}`,
          },
          {
            type: "text",
            text: `Browserbase Live Debugger URL: ${debugUrl}`,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to navigate: ${errorMsg}`);
    }
  };

  return {
    action,
    waitForNetwork: false,
  };
}

const navigateTool: Tool<typeof NavigateInputSchema> = {
  capability: "core",
  schema: navigateSchema,
  handle: handleNavigate,
};

export default navigateTool;
