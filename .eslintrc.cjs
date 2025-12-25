module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        tsconfigRootDir: __dirname,
        project: "**/tsconfig.json",
    },
    plugins: ["@typescript-eslint", "check-file", "import"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        // Style
        "semi": ["error", "always"],
        "quotes": ["error", "double", { "avoidEscape": true }],
        "comma-dangle": ["error", "always-multiline"],
        "object-curly-spacing": ["error", "always"],
        "arrow-parens": ["error", "always"],

        // Code quality
        "eqeqeq": ["error", "always"],
        "no-var": "error",
        "prefer-const": "error",
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": "error",

        // Error prevention
        "no-fallthrough": "error",
        "no-return-await": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],

        // TypeScript
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],

        // Imports
        "import/order": ["error", {
            "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
            "newlines-between": "never",
            "alphabetize": { "order": "asc", "caseInsensitive": true },
        }],
        "import/no-duplicates": "error",

        // Disabled
        "no-console": "off",
        "no-empty": "off",
        "@typescript-eslint/no-explicit-any": "off",
    },
    overrides: [
        {
            files: ["**/src/**/*Schema.ts"],
            rules: {
                "@typescript-eslint/naming-convention": [
                    "error",
                    {
                        "selector": "variable",
                        "format": ["PascalCase"],
                    },
                    {
                        "selector": "typeLike",
                        "format": ["PascalCase"],
                    },
                ],
                "check-file/filename-naming-convention": [
                    "error",
                    { "**/*Schema.ts": "PASCAL_CASE" },
                ],
            },
        },
        {
            files: ["**/src/**/*.ts"],
            excludedFiles: ["**/src/**/*Schema.ts"],
            rules: {
                "@typescript-eslint/naming-convention": [
                    "error",
                    {
                        "selector": "variable",
                        "format": ["snake_case", "UPPER_CASE"],
                        "leadingUnderscore": "allow",
                    },
                    {
                        "selector": "function",
                        "format": ["snake_case"],
                    },
                    {
                        "selector": "parameter",
                        "format": ["snake_case"],
                        "leadingUnderscore": "allow",
                    },
                    {
                        "selector": "typeLike",
                        "format": ["PascalCase"],
                    },
                ],
                "check-file/filename-naming-convention": [
                    "error",
                    { "**/*.ts": "SNAKE_CASE" },
                    { "ignoreMiddleExtensions": true },
                ],
            },
        },
        {
            files: ["**/src/**/*.tsx"],
            rules: {
                "@typescript-eslint/naming-convention": [
                    "error",
                    {
                        "selector": "variable",
                        "format": ["camelCase", "PascalCase", "UPPER_CASE"],
                        "leadingUnderscore": "allow",
                    },
                    {
                        "selector": "function",
                        "format": ["camelCase", "PascalCase"],
                    },
                    {
                        "selector": "parameter",
                        "format": ["camelCase"],
                        "leadingUnderscore": "allow",
                    },
                    {
                        "selector": "typeLike",
                        "format": ["PascalCase"],
                    },
                ],
                "check-file/filename-naming-convention": [
                    "error",
                    { "**/*.tsx": "PASCAL_CASE" },
                ],
            },
        },
    ],
};

