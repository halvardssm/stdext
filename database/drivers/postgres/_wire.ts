import { BinaryReader, BinaryWriter } from "@stdext/encoding/binary";
import { ConnectionError } from "../../sql/mod.ts";

/**
 * Builds frontend messages, which consist of a type byte (except for startup
 * messages) and an int32 length. Several messages can be written before
 * flushing, so that they are sent in a single write.
 */
export class MessageWriter extends BinaryWriter {
  #start = 0;

  /** Start a message, with a type byte unless it is a startup message */
  begin(type?: string): this {
    if (type !== undefined) this.uint8(type.charCodeAt(0));
    this.#start = this.position;
    // The length is filled in by `end`.
    return this.int32(0);
  }

  /** End the current message by writing its length */
  end(): this {
    const end = this.position;
    this.position = this.#start;
    this.int32(end - this.#start);
    this.position = end;
    return this;
  }

  /** A length prefixed string or byte array, or `-1` for null */
  value(value: string | Uint8Array | null): this {
    if (value === null) return this.int32(-1);
    const bytes = typeof value === "string"
      ? new TextEncoder().encode(value)
      : value;
    return this.int32(bytes.length).bytes(bytes);
  }

  /** Take the written messages and reset the writer */
  flush(): Uint8Array {
    const out = this.toBytes();
    this.reset();
    return out;
  }
}

/**
 * Reads the fields of a backend message body.
 */
export class BodyReader extends BinaryReader {
  /** A length prefixed string, or `null` for a length of `-1` */
  value(): string | null {
    const length = this.int32();
    return length === -1 ? null : this.string(length);
  }
}

/** A backend message */
export interface Message {
  type: string;
  body: BodyReader;
}

/** A readable byte source, such as a `Deno.Conn` */
export interface ByteReader {
  read(buffer: Uint8Array): Promise<number | null>;
}

/**
 * Reads backend messages from a byte source.
 */
export class MessageReader {
  readonly #reader: ByteReader;
  #buffer = new Uint8Array(16 * 1024);
  #start = 0;
  #end = 0;

  constructor(reader: ByteReader) {
    this.#reader = reader;
  }

  async #fill(size: number): Promise<void> {
    while (this.#end - this.#start < size) {
      if (this.#start + size > this.#buffer.length) {
        const buffer = this.#buffer.length < size
          ? new Uint8Array(Math.max(size, this.#buffer.length * 2))
          : this.#buffer;
        buffer.set(this.#buffer.subarray(this.#start, this.#end));
        this.#end -= this.#start;
        this.#start = 0;
        this.#buffer = buffer;
      }
      const read = await this.#reader.read(this.#buffer.subarray(this.#end));
      if (read === null) {
        throw new ConnectionError("Connection closed by the server");
      }
      this.#end += read;
    }
  }

  /** Read a single byte, used for the response to an SSL request */
  async byte(): Promise<number> {
    await this.#fill(1);
    return this.#buffer[this.#start++];
  }

  /** Whether bytes have been read beyond the last returned message */
  get buffered(): boolean {
    return this.#end > this.#start;
  }

  /** Read the next message */
  async message(): Promise<Message> {
    await this.#fill(5);
    const type = String.fromCharCode(this.#buffer[this.#start]);
    const length = new DataView(this.#buffer.buffer).getInt32(this.#start + 1);
    await this.#fill(1 + length);
    const body = this.#buffer.slice(this.#start + 5, this.#start + 1 + length);
    this.#start += 1 + length;
    return { type, body: new BodyReader(body) };
  }
}
