# Dental Manager - Starter 

A monorepo setup to manage both Backend and Frontend of the Dental Manager application.

## 🚀 Getting Started

Follow the steps below to set up and run the project:

1. Install dependency
```sh
npm install
```

2. Copy Environment Variables

Create `.env` files from the provided `.env.example` templates:
Change the required ones env in .env files.

```sh
npm run setup:env
```

3. Generate Prisma, and its Types.

- Migrate the db: 
```sh
npm run db:migrate
```

- Generate the db types: 
```sh
npm run db:generate
```


4. To Simply run all the app(Backend + Frontend).
```sh
npm run dev
```


5. Now you need to run the selnium service as well in new terminal. 
```sh 
cd apps/SeleniumService
python3 agent.py
```

## 📖 Developer Documentation

- [Setting up server environment](docs/server-setup.md) — the first step, to run this app in environment.
- [Development Hosts & Ports](docs/ports.md) — which app runs on which host/port


## This in a Turborepo. What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app with [Tailwind CSS](https://tailwindcss.com/)
- `web`: another [Next.js](https://nextjs.org/) app with [Tailwind CSS](https://tailwindcss.com/)
- `ui`: a stub React component library with [Tailwind CSS](https://tailwindcss.com/) shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Building packages/ui

This example is set up to produce compiled styles for `ui` components into the `dist` directory. The component `.tsx` files are consumed by the Next.js apps directly using `transpilePackages` in `next.config.ts`. This was chosen for several reasons:

- Make sharing one `tailwind.config.ts` to apps and packages as easy as possible.
- Make package compilation simple by only depending on the Next.js Compiler and `tailwindcss`.
- Ensure Tailwind classes do not overwrite each other. The `ui` package uses a `ui-` prefix for it's classes.
- Maintain clear package export boundaries.

Another option is to consume `packages/ui` directly from source without building. If using this option, you will need to update the `tailwind.config.ts` in your apps to be aware of your package locations, so it can find all usages of the `tailwindcss` class names for CSS compilation.

For example, in [tailwind.config.ts](packages/tailwind-config/tailwind.config.ts):

```js
  content: [
    // app content
    `src/**/*.{js,ts,jsx,tsx}`,
    // include packages if not transpiling
    "../../packages/ui/*.{js,ts,jsx,tsx}",
  ],
```

If you choose this strategy, you can remove the `tailwindcss` and `autoprefixer` dependencies from the `ui` package.

### Utilities

This Turborepo has some additional tools already setup for you:

- [Tailwind CSS](https://tailwindcss.com/) for styles
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
