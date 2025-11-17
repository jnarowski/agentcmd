# Workflow Planning Prompt - see "be84e0e1-57f1-4327-89af-b1ea137eca50"

I want to build a workflow system that allows you to write workflows like `workflows/simple-sdlc-workflow.ts` in code and then register them to be executed in the apps/app interface in a new part of the app called "workflows". These workflows will perform a variety of tasks from checking out git branches, pushing code online and most importantly executing CLI tools like claude code and others programmatically. This will support the full SDLC cycle.

We need to build the "engine" for this, as well as the Typescript SDK we'd need to create and register these workflows with the app.

**Important:** For now, let's focus on the code sdk and the initial architecture (table structure, endpoints etc) and not the frontend UX.

See _packages/agent-workflows_ for inspiration. I might not use this code or structure at all, but it will help you get the idea. Keep in mind this code is very much sudo-code, but designed to give you the high level idea.

**The end goal is that in any repo, I could write something like:**

```
const options = {
label: "Standard SDLC Workflow",
id: "standard-sdlc-workflow"
}

createWorkflow(options, async () {
// execute command
checkoutBranch(xxx)

// execute step (logs status updates of everything ran, session id(s) from each step if it executes cli commands), attaches to the task
const planResult = executeStep('plan', async() { .... })
completeResult = executeStep('implement', async() { .... })

// execute command - starts the app, captures e2e screenshots, attaches them to the task
completeResult = executeStep('e2e-test', async() { .... })

// execute command
commitAndPushChanges(....)
})
```

Then in apps/app, I'd be able to navigate to worklows, pick a spec from .`agent/specs/todo/[spec].md` and hit execute. This would then show a kanban style board with two columns, "plan", and "execute". The task would move between the columns as work progressed.

We can focus first on the database structure, and then move to the Typescript SDK

Can you help me brainstorm this feature. Let's keep the scope constrained and limited to ensure we get each part right. Please use a subagent to do research on other system designs that operate this way for inspiration
