# Advanced: Contributing

We built `.vibe` to solve our own problems, and we open-sourced it in the hope that it might solve yours, too. Contributions are not just welcome; they are essential to making `.vibe` the best it can be.

### Our Technical Philosophy

Before you dive in, it's important to understand the core principles that guide our development. We are passionate about building software in a specific way.

1. **Functional First:** The entire codebase is written in a functional style using **Effect-TS**. There are **no custom classes** for business logic. We believe this leads to more robust, testable, and composable code.
2. **Deno Native:** We use Deno as our runtime and prefer its native APIs over Node.js compatibility layers.
3. **Type-Safe to the Core:** We use Zod v4 for schema validation and a tagged union system (`lib/errors.ts`) for all error handling. This ensures type safety from the API layer all the way down to the file system.

If you're excited by this way of building software, you're in the right place.

### Setting Up Your Development Environment

Getting started is simple. All you need is [Deno](https://deno.com).

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/vhybzos/vibe.git
   cd vibe
   ```

2. **Cache Dependencies:**
   Deno handles dependencies via URL imports. Cache them locally with:
   ```bash
   deno cache --reload daemon.ts cli.ts
   ```

3. **Run the Test Suite:**
   Before making any changes, make sure the test suite is green.
   ```bash
   deno task test
   ```

### How to Contribute

1. **Find an Issue:** A great place to start is the [GitHub Issues](https://github.com/vhybzos/vibe/issues) page. Look for issues tagged `good first issue` or `help wanted`.
2. **Fork and Branch:** Fork the repository and create a new branch for your feature or bug fix.
3. **Write Code (and Tests!):** We follow a Test-Driven Development (TDD) approach. Any new feature or bug fix should be accompanied by corresponding tests.
4. **Check Your Work:** Before submitting, run the full local validation suite:
   ```bash
   deno task fmt    # Check formatting
   deno task lint   # Check for linting errors
   deno task check  # Run the TypeScript compiler
   deno task test   # Run the full test suite
   ```
5. **Submit a Pull Request:** Push your branch to your fork and open a pull request against the `main` branch of the official repository. Provide a clear description of the problem you're solving and the changes you've made.

We are thrilled to have you here. Let's build the future of AI development, together.
