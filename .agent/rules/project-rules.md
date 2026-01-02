---
trigger: always_on
---

## Project Rules & Agreements

1. **Language**: We speak and interact in Spanish or other languages, but all the documentation, code, code comments, and technical outputs MUST be in **English**.
2. **Package Manager**: **Yarn** is the mandatory package manager. Do not use npm or pnpm.
3. **Methodology**: Follow a strict **TDD (Test-Driven Development)** approach for all service development.
4. **Architecture**: Respect the **Standalone Services** (Poly-repo) structure.
5. **Git**: No automatic commits or pushes should be performed without the explicit consent of the developer.
6. **Minimalist & Clean Code Philosophy**:
   - Make only the minimum necessary changes to accomplish the task.
   - Every change must leave the code cleaner than before.
   - After completing any planned work, perform a mandatory cleanup review to identify and remove:
     - Orphan/dead code (unused imports, variables, functions, components)
     - Redundant styles (CSS properties that override each other or have no effect)
     - Unnecessary comments or commented-out code
     - Empty files or unused dependencies
   - Prefer editing existing files over creating new ones.
   - When removing functionality, ensure all related code is also removed (tests, styles, imports).
