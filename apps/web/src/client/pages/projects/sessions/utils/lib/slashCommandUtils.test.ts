import { describe, it, expect } from 'vitest';
import { DEFAULT_SLASH_COMMANDS } from './slashCommandUtils';

describe('slashCommandUtils', () => {
  describe('DEFAULT_SLASH_COMMANDS', () => {
    it('should have exactly 24 default commands', () => {
      expect(DEFAULT_SLASH_COMMANDS).toHaveLength(24);
    });

    it('should have all required fields for each command', () => {
      DEFAULT_SLASH_COMMANDS.forEach((command) => {
        expect(command).toHaveProperty('name');
        expect(command).toHaveProperty('fullCommand');
        expect(command).toHaveProperty('description');
        expect(command).toHaveProperty('type');

        expect(typeof command.name).toBe('string');
        expect(typeof command.fullCommand).toBe('string');
        expect(typeof command.description).toBe('string');
        expect(command.type).toBe('builtin');

        // fullCommand should start with /
        expect(command.fullCommand).toMatch(/^\//);

        // name should be fullCommand without leading /
        expect(command.name).toBe(command.fullCommand.slice(1));
      });
    });

    it('should not have duplicate command names', () => {
      const names = DEFAULT_SLASH_COMMANDS.map((cmd) => cmd.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should not have duplicate full commands', () => {
      const commands = DEFAULT_SLASH_COMMANDS.map((cmd) => cmd.fullCommand);
      const uniqueCommands = new Set(commands);
      expect(uniqueCommands.size).toBe(commands.length);
    });

    it('should include expected core commands', () => {
      const commandNames = DEFAULT_SLASH_COMMANDS.map((cmd) => cmd.name);

      // Check for essential commands
      expect(commandNames).toContain('help');
      expect(commandNames).toContain('clear');
      expect(commandNames).toContain('init');
      expect(commandNames).toContain('config');
      expect(commandNames).toContain('model');
    });

    it('should have non-empty descriptions', () => {
      DEFAULT_SLASH_COMMANDS.forEach((command) => {
        expect(command.description.length).toBeGreaterThan(0);
      });
    });
  });
});
