import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // These screens hydrate authenticated Supabase data and subscribe to Realtime.
    // Their state updates are intentionally initiated from effects.
    files: [
      "app/admin/bulletins/page.tsx",
      "app/admin/members/page.tsx",
      "app/bulletin/page.tsx",
      "app/profil/page.tsx",
      "app/riding/approval/page.tsx",
      "app/undangan/[token]/page.tsx",
      "hooks/use-member-access.ts",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: ["app/agenda/page.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    files: ["app/**/page.tsx", "hooks/use-member-access.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
