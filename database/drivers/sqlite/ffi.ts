import { dlopen } from "@stdext/ffi";

const symbols = {
  sqlite3_open_v2: {
    parameters: [
      "buffer", // const char *filename
      "buffer", // sqlite3 **ppDb
      "i32", // int flags
      "pointer", // const char *zVfs
    ],
    result: "i32",
  },

  sqlite3_close_v2: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "i32",
  },

  sqlite3_changes: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "i32",
  },

  sqlite3_total_changes: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "i32",
  },

  sqlite3_last_insert_rowid: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "i32",
  },

  sqlite3_get_autocommit: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "i32",
  },

  sqlite3_prepare_v2: {
    parameters: [
      "pointer", // sqlite3 *db
      "buffer", // const char *zSql
      "i32", // int nByte
      "buffer", // sqlite3_stmt **ppStmt
      "pointer", // const char **pzTail
    ],
    result: "i32",
  },

  sqlite3_reset: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_clear_bindings: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_step: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_column_count: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_column_type: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "i32",
  },

  sqlite3_column_text: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "pointer",
  },
  sqlite3_column_value: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "pointer",
  },

  sqlite3_finalize: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_exec: {
    parameters: [
      "pointer", // sqlite3 *db
      "buffer", // const char *sql
      "pointer", // sqlite3_callback callback
      "pointer", // void *arg
      "buffer", // char **errmsg
    ],
    result: "i32",
  },

  sqlite3_free: {
    parameters: [
      "pointer", // void *p
    ],
    result: "void",
  },

  sqlite3_column_int: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "i32",
  },

  sqlite3_column_double: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "f64",
  },

  sqlite3_column_blob: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "pointer",
  },

  sqlite3_column_bytes: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "i32",
  },

  sqlite3_column_name: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "pointer",
  },

  sqlite3_column_decltype: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "u64",
  },

  sqlite3_bind_parameter_index: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "buffer", // const char *zName
    ],
    result: "i32",
  },

  sqlite3_bind_text: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
      "buffer", // const char *zData
      "i32", // int nData
      "pointer", // void (*xDel)(void*)
    ],
    result: "i32",
  },

  sqlite3_bind_blob: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
      "buffer", // const void *zData
      "i32", // int nData
      "pointer", // void (*xDel)(void*)
    ],
    result: "i32",
  },

  sqlite3_bind_double: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
      "f64", // double rValue
    ],
    result: "i32",
  },

  sqlite3_bind_int: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
      "i32", // int iValue
    ],
    result: "i32",
  },

  sqlite3_bind_int64: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
      "i64", // i64 iValue
    ],
    result: "i32",
  },

  sqlite3_bind_null: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "i32",
  },

  sqlite3_expanded_sql: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "pointer",
  },

  sqlite3_bind_parameter_count: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_complete: {
    parameters: [
      "buffer", // const char *sql
    ],
    result: "i32",
  },

  sqlite3_sourceid: {
    parameters: [],
    result: "pointer",
  },

  sqlite3_libversion: {
    parameters: [],
    result: "pointer",
  },

  sqlite3_blob_open: {
    parameters: [
      "pointer", /* sqlite3 *db */
      "buffer", /* const char *zDb */
      "buffer", /* const char *zTable */
      "buffer", /* const char *zColumn */
      "i64", /* sqlite3_int64 iRow */
      "i32", /* int flags */
      "buffer", /* sqlite3_blob **ppBlob */
    ],
    result: "i32",
  },

  sqlite3_blob_read: {
    parameters: [
      "pointer", /* sqlite3_blob *blob */
      "buffer", /* void *Z */
      "i32", /* int N */
      "i32", /* int iOffset */
    ],
    result: "i32",
  },

  sqlite3_blob_write: {
    parameters: [
      "pointer", /* sqlite3_blob *blob */
      "buffer", /* const void *z */
      "i32", /* int n */
      "i32", /* int iOffset */
    ],
    result: "i32",
  },

  sqlite3_blob_bytes: {
    parameters: ["pointer" /* sqlite3_blob *blob */],
    result: "i32",
  },

  sqlite3_blob_close: {
    parameters: ["pointer" /* sqlite3_blob *blob */],
    result: "i32",
  },

  sqlite3_sql: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "pointer",
  },

  sqlite3_stmt_readonly: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
    ],
    result: "i32",
  },

  sqlite3_bind_parameter_name: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "pointer",
  },

  sqlite3_errcode: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "i32",
  },

  sqlite3_errmsg: {
    parameters: [
      "pointer", // sqlite3 *db
    ],
    result: "pointer",
  },

  sqlite3_errstr: {
    parameters: [
      "i32", // int rc
    ],
    result: "pointer",
  },

  sqlite3_column_int64: {
    parameters: [
      "pointer", // sqlite3_stmt *pStmt
      "i32", // int iCol
    ],
    result: "i64",
  },

  sqlite3_backup_init: {
    parameters: [
      "pointer", // sqlite3 *pDest
      "buffer", // const char *zDestName
      "pointer", // sqlite3 *pSource
      "buffer", // const char *zSourceName
    ],
    result: "pointer",
  },

  sqlite3_backup_step: {
    parameters: [
      "pointer", // sqlite3_backup *p
      "i32", // int nPage
    ],
    result: "i32",
  },

  sqlite3_backup_finish: {
    parameters: [
      "pointer", // sqlite3_backup *p
    ],
    result: "i32",
  },

  sqlite3_backup_remaining: {
    parameters: [
      "pointer", // sqlite3_backup *p
    ],
    result: "i32",
  },

  sqlite3_backup_pagecount: {
    parameters: [
      "pointer", // sqlite3_backup *p
    ],
    result: "i32",
  },

  sqlite3_create_function: {
    parameters: [
      "pointer", // sqlite3 *db
      "buffer", // const char *zFunctionName
      "i32", // int nArg
      "i32", // int eTextRep
      "pointer", // void *pApp
      "pointer", // void (*xFunc)(sqlite3_context*,int,sqlite3_value**)
      "pointer", // void (*xStep)(sqlite3_context*,int,sqlite3_value**)
      "pointer", // void (*xFinal)(sqlite3_context*)
    ],
    result: "i32",
    optional: true,
  },

  sqlite3_result_blob: {
    parameters: [
      "pointer", // sqlite3_context *p
      "buffer", // const void *z
      "i32", // int n
      "isize", // void (*xDel)(void*)
    ],
    result: "void",
  },

  sqlite3_result_double: {
    parameters: [
      "pointer", // sqlite3_context *p
      "f64", // double rVal
    ],
    result: "void",
  },

  sqlite3_result_error: {
    parameters: [
      "pointer", // sqlite3_context *p
      "buffer", // const char *z
      "i32", // int n
    ],
    result: "void",
  },

  sqlite3_result_int: {
    parameters: [
      "pointer", // sqlite3_context *p
      "i32", // int iVal
    ],
    result: "void",
  },

  sqlite3_result_int64: {
    parameters: [
      "pointer", // sqlite3_context *p
      "i64", // sqlite3_int64 iVal
    ],
    result: "void",
  },

  sqlite3_result_null: {
    parameters: [
      "pointer", // sqlite3_context *p
    ],
    result: "void",
  },

  sqlite3_result_text: {
    parameters: [
      "pointer", // sqlite3_context *p
      "buffer", // const char *z
      "i32", // int n
      "isize", // void (*xDel)(void*)
    ],
    result: "void",
  },

  sqlite3_value_type: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "i32",
  },
  sqlite3_value_subtype: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "i32",
  },

  sqlite3_value_blob: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "pointer",
  },

  sqlite3_value_double: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "f64",
  },

  sqlite3_value_int: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "i32",
  },

  sqlite3_value_int64: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "i64",
  },

  sqlite3_value_text: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "pointer",
  },

  sqlite3_value_bytes: {
    parameters: [
      "pointer", // sqlite3_value *pVal
    ],
    result: "i32",
  },

  sqlite3_aggregate_context: {
    parameters: [
      "pointer", // sqlite3_context *p
      "i32", // int nBytes
    ],
    result: "pointer",
    optional: true,
  },

  sqlite3_enable_load_extension: {
    parameters: [
      "pointer", // sqlite3 *db
      "i32", // int onoff
    ],
    result: "i32",
    optional: true,
  },

  sqlite3_load_extension: {
    parameters: [
      "pointer", // sqlite3 *db
      "buffer", // const char *zFile
      "buffer", // const char *zProc
      "buffer", // const char **pzErrMsg
    ],
    result: "i32",
    optional: true,
  },

  sqlite3_initialize: {
    parameters: [],
    result: "i32",
  },

  sqlite3_update_hook: {
    parameters: [
      "pointer", // sqlite3 *db
      "pointer", // void *pArg
      "pointer", // void (*xUpdate)(sqlite3_context*,int,sqlite3_value**,sqlite3_value**)
    ],
    result: "pointer",
  },

  sqlite3_stmt_status: {
    parameters: ["pointer", "i32", "i32"],
    result: "i32",
  },
} as const satisfies Deno.ForeignLibraryInterface;

let lib: Deno.DynamicLibrary<typeof symbols>["symbols"];

function tryGetEnv(key: string): string | undefined {
  try {
    return Deno.env.get(key);
  } catch (e) {
    if (e instanceof Deno.errors.PermissionDenied) {
      return undefined;
    }
    throw e;
  }
}

try {
  const customPath = tryGetEnv("DENO_SQLITE_PATH");
  if (customPath) {
    lib = Deno.dlopen(customPath, symbols).symbols;
  } else {
    lib = (
      await dlopen(
        symbols,
        {
          filename: {
            darwin: {
              aarch64: {
                url:
                  "https://sqlite.org/2026/sqlite-tools-osx-arm64-3530400.zip",
                type: "zip",
                archivePath: "sqlite3",
              },
              x86_64: {
                url: "https://sqlite.org/2026/sqlite-tools-osx-x64-3530400.zip",
                type: "zip",
                archivePath: "sqlite3",
              },
            },
            linux: {
              x86_64: {
                url:
                  "https://sqlite.org/2026/sqlite-tools-linux-x64-3530400.zip",
                type: "zip",
                archivePath: "sqlite3",
              },
            },
            windows: {
              aarch64: {
                url: "https://sqlite.org/2026/sqlite-dll-win-arm64-3530400.zip",
                type: "zip",
                archivePath: "sqlite3",
              },
              x86_64: {
                url: "https://sqlite.org/2026/sqlite-dll-win-x64-3530400.zip",
                type: "zip",
                archivePath: "sqlite3",
              },
            },
          },
        },
      )
    ).symbols;
  }
} catch (e) {
  if (e instanceof Deno.errors.PermissionDenied) {
    throw e;
  }

  throw new Error("Failed to load SQLite3 Dynamic Library", { cause: e });
}

const init = lib.sqlite3_initialize();
if (init !== 0) {
  throw new Error(`Failed to initialize SQLite3: ${init}`);
}

export default lib;

/**
 * Downloads a .zip file and extracts a single file from it.
 * @param url - URL of the .zip file to download
 * @param filenameInZip - Name of the file to extract from the .zip
 * @param outputDir - Directory to save the extracted file (default: ./downloads)
 * @returns Path to the extracted file
 */
export async function downloadAndExtractSingleFile(
  url: string,
  filenameInZip: string,
  outputDir: string = "./downloads",
): Promise<string> {
  // Ensure the output directory exists
  await ensureDir(outputDir);

  // Download the .zip file
  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  // Read the .zip file as a stream
  const reader = getReaderFromStream(response.body!);
  const zipReader = new ZipReader(reader);

  // Find and extract the specified file
  for (const entry of await zipReader.getEntries()) {
    if (entry.filename === filenameInZip && entry.getData) {
      const data = await entry.getData(new Uint8ArrayWriter());
      const outputPath = `${outputDir}/${filenameInZip}`;
      await Deno.writeFile(outputPath, data);
      console.log(`Extracted: ${filenameInZip} to ${outputPath}`);
      await zipReader.close();
      return outputPath;
    }
  }

  throw new Error(`File ${filenameInZip} not found in the .zip archive.`);
}

// Helper class for Uint8ArrayWriter
class Uint8ArrayWriter {
  private chunks: Uint8Array[] = [];

  write(chunk: Uint8Array): void {
    this.chunks.push(chunk);
  }

  async finish(): Promise<Uint8Array> {
    const totalLength = this.chunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
