This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important for Production (Vercel):**
- The `SUPABASE_SERVICE_ROLE_KEY` is **required** for organization creation and other administrative operations
- This key bypasses Row Level Security (RLS) and should be kept secure
- Never expose it in client-side code or commit it to version control
- Add all these variables to your Vercel project settings under Settings → Environment Variables

For detailed instructions on fixing organization creation issues on Vercel, see [VERCEL_ENV_FIX.md](./VERCEL_ENV_FIX.md).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Code Quality

This project uses automated code quality checks to ensure consistent and error-free code.

### Pre-commit Hooks

We use [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to run checks before each commit:

- **TypeScript Type Checking**: Ensures all TypeScript code is properly typed
- **ESLint**: Checks for code quality issues and automatically fixes them
- **Prettier**: Formats code consistently
- **Commitlint**: Enforces [Conventional Commits](https://www.conventionalcommits.org/) format

#### Commit Message Format

All commit messages must follow the Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types allowed: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `ci`, `build`

Examples:

- `feat: add user authentication`
- `fix(api): resolve database connection issue`
- `docs: update README with installation steps`

#### Bypassing Hooks

If you need to bypass the pre-commit hooks (not recommended), you can use:

```bash
git commit --no-verify -m "your message"
```

### Running Checks Manually

```bash
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npx tsc --noEmit    # Check TypeScript types
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
