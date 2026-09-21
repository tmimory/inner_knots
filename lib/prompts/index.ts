/**
 * Prompt fragments: markdown in `prompts/`, rendered here. Server only.
 *
 * No prompt prose lives in TypeScript. Code picks which fragments to render and
 * supplies the variables; every word the model reads comes from a markdown file
 * the user can edit while the dev server is running.
 */
export * from "./compose";
export * from "./loader";
export * from "./template";
