import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        filePafileParallelism: false,
        setupFiles: ['./vitest.setup.ts'],
    }
})