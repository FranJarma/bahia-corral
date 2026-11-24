import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('arquitectura y calidad del proyecto', () => {
  it('incluye scripts de validación, TypeScript estricto y las reglas para agentes', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts).toHaveProperty('lint');
    expect(pkg.scripts).toHaveProperty('format:check');
    expect(pkg.scripts).toHaveProperty('typecheck');
    expect(pkg.scripts).toHaveProperty('test:unit');
    expect(pkg.scripts).toHaveProperty('test:integration');
    expect(pkg.scripts).toHaveProperty('test:e2e');
    expect(pkg.scripts).toHaveProperty('check');
    expect(JSON.parse(readFileSync('tsconfig.json', 'utf8')).compilerOptions.strict).toBe(true);
    expect(existsSync('AGENTS.md')).toBe(true);
  });
});
