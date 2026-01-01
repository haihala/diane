import type { Plugin } from "@opencode-ai/plugin";

export const PreventEditEditorTest: Plugin = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  return {
    "tool.execute.before": async (input, output) => {
      const { tool } = input;
      const { args } = output;

      // Check if args exists first, then check if the tool is edit or write and targets editor.test.ts
      if (tool === "edit" || tool === "write") {
        const filePath = args.filePath as string;

        if (filePath && filePath.includes("editor.test.ts")) {
          throw new Error(
            "Editing editor.test.ts is not allowed. This file is protected by the prevent-edit-editor-test plugin.",
          );
        }
      }
    },
  };
};
