import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { cacheFile, denoCacheDir, homeDir } from "./cache.ts";
import { exists } from "@std/fs";
import { join } from "@std/path";

const TEST_FILE_URL =
  "https://raw.githubusercontent.com/halvardssm/stdext/refs/tags/0.0.1/README.md";

Deno.test("denoCacheDir", async (t) => {
  await t.step(
    "returns DENO_DIR env var when set",
    async () => {
      const originalDenoDir = Deno.env.get("DENO_DIR");

      try {
        // Set DENO_DIR
        Deno.env.set("DENO_DIR", "/custom/deno/cache");

        const result = await denoCacheDir();
        assertEquals(result, "/custom/deno/cache");
      } finally {
        // Restore original DENO_DIR
        if (originalDenoDir) {
          Deno.env.set("DENO_DIR", originalDenoDir);
        } else {
          Deno.env.delete("DENO_DIR");
        }
      }
    },
  );

  await t.step(
    "returns default cache dir",
    async () => {
      const originalDenoDir = Deno.env.get("DENO_DIR");
      const originalHome = Deno.env.get("HOME");
      const originalXdgCache = Deno.env.get("XDG_CACHE_HOME");
      const originalBuild = Deno.build;

      try {
        // Mock Linux environment
        Deno.env.delete("DENO_DIR");
        Deno.env.set("HOME", "/home/test");
        Deno.env.delete("XDG_CACHE_HOME");

        // Override os detection
        (Deno as any).build = { ...originalBuild, os: "linux" };

        const result = await denoCacheDir();
        assertEquals(result, "/home/test/.cache/deno");
      } finally {
        // Restore environment
        if (originalDenoDir) {
          Deno.env.set("DENO_DIR", originalDenoDir);
        }
        if (originalHome) {
          Deno.env.set("HOME", originalHome);
        }
        if (originalXdgCache) {
          Deno.env.set("XDG_CACHE_HOME", originalXdgCache);
        }
        (Deno as any).build = originalBuild;
      }
    },
  );

  await t.step(
    "creates directory when ensure option is true",
    async () => {
      const originalDenoDir = Deno.env.get("DENO_DIR");
      const originalHome = Deno.env.get("HOME");
      const originalBuild = Deno.build;

      const testCacheDir = "./test_deno_cache";
      const absoluteTestCacheDir =
        new URL(testCacheDir, import.meta.url).pathname;

      try {
        // Mock environment to use test directory
        Deno.env.delete("DENO_DIR");
        Deno.env.set("HOME", absoluteTestCacheDir);

        // Override os detection to use default path
        (Deno as any).build = { ...originalBuild, os: "linux" };

        const result = await denoCacheDir({ ensure: true });
        const expectedPath = `${absoluteTestCacheDir}/.cache/deno`;
        assertEquals(result, expectedPath);

        // Verify directory was created
        const dirExists = await exists(expectedPath);
        assert(
          dirExists,
          "Directory should be created when ensure option is true",
        );

        // Clean up
        await Deno.remove(expectedPath, { recursive: true });
      } finally {
        // Restore environment
        if (originalDenoDir) {
          Deno.env.set("DENO_DIR", originalDenoDir);
        }
        if (originalHome) {
          Deno.env.set("HOME", originalHome);
        }
        (Deno as any).build = originalBuild;
      }
    },
  );

  await t.step(
    "throws error when throws option is true and directory doesn't exist",
    async () => {
      const originalDenoDir = Deno.env.get("DENO_DIR");
      const originalHome = Deno.env.get("HOME");
      const originalBuild = Deno.build;

      try {
        // Mock environment
        Deno.env.delete("DENO_DIR");
        Deno.env.set("HOME", "/nonexistent");

        // Override os detection
        (Deno as any).build = { ...originalBuild, os: "linux" };

        await assertRejects(
          async () => {
            await denoCacheDir({ throws: true });
          },
          TypeError,
          "Cache dir not found",
        );
      } finally {
        // Restore environment
        if (originalDenoDir) {
          Deno.env.set("DENO_DIR", originalDenoDir);
        }
        if (originalHome) {
          Deno.env.set("HOME", originalHome);
        }
        (Deno as any).build = originalBuild;
      }
    },
  );
});

Deno.test("cacheFile", async (t) => {
  const testCacheDir = await Deno.makeTempDir();
  const testFilePath = join(testCacheDir, "README.md");

  await t.step(
    "throws error when cacheControl is 'cachedOnly' and file doesn't exist",
    async () => {
      await assertRejects(
        async () => {
          await cacheFile(TEST_FILE_URL, testFilePath, {
            cacheControl: "cachedOnly",
          });
        },
        Error,
        "No cached file found",
      );
    },
  );

  await t.step(
    "downloads and caches file when it doesn't exist",
    async () => {
      const cachedPath = await cacheFile(TEST_FILE_URL, testFilePath);

      const content = await Deno.readTextFile(cachedPath);
      assert(
        content.startsWith("# Deno Standard Library Extended"),
        "Cached file should match the readme",
      );
    },
  );

  await t.step(
    "uses existing cached file when cacheControl is 'cachedOnly'",
    async () => {
      const originalStats = await Deno.stat(testFilePath);

      await cacheFile(TEST_FILE_URL, testFilePath, {
        cacheControl: "cachedOnly",
      });

      const cachedStats = await Deno.stat(testFilePath);

      assertEquals(originalStats.ino, cachedStats.ino);
      assertEquals(originalStats.mtime, cachedStats.mtime);
    },
  );

  await t.step(
    "returns existing cached file when cacheControl is default",
    async () => {
      const originalStats = await Deno.stat(testFilePath);

      const cachedPath = await cacheFile(TEST_FILE_URL, testFilePath);

      const cachedStats = await Deno.stat(testFilePath);

      assertEquals(originalStats.ino, cachedStats.ino);
      assertEquals(originalStats.mtime, cachedStats.mtime);

      const content = await Deno.readTextFile(cachedPath);
      assert(
        content.startsWith("# Deno Standard Library Extended"),
        "Cached file should match the readme",
      );
    },
  );

  await t.step("reloads file when cacheControl is 'reload'", async () => {
    const originalStats = await Deno.stat(testFilePath);

    const cachedPath = await cacheFile(TEST_FILE_URL, testFilePath, {
      cacheControl: "reload",
    });

    const cachedStats = await Deno.stat(testFilePath);

    assertNotEquals(originalStats.ino, cachedStats.ino);
    assertNotEquals(originalStats.mtime, cachedStats.mtime);

    const content = await Deno.readTextFile(cachedPath);
    assert(
      content.startsWith("# Deno Standard Library Extended"),
      "Cached file should match the readme",
    );
  });

  await t.step(
    "throws error when remote file cannot be fetched",
    async () => {
      const invalidUrl =
        "https://raw.githubusercontent.com/halvardssm/stdext/refs/tags/0.0.1/NONEXISTENT.md";
      const invalidPath = join(testCacheDir, "NONEXISTENT.md");

      await assertRejects(
        async () => {
          await cacheFile(invalidUrl, invalidPath);
        },
        Error,
        "Error fetching remote file",
      );
    },
  );
});
