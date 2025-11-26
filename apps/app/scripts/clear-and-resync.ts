#!/usr/bin/env tsx
import { prisma } from '../src/shared/prisma';

console.log('Clearing all projects and sessions...');

// Delete all sessions (will cascade due to foreign key)
const deletedSessions = await prisma.agentSession.deleteMany();
console.log(`Deleted ${deletedSessions.count} sessions`);

// Delete all projects
const deletedProjects = await prisma.project.deleteMany();
console.log(`Deleted ${deletedProjects.count} projects`);

console.log('\nDatabase cleared! You can now re-sync from the UI.');
console.log('The sync will import projects with >3 sessions and their session data.');
