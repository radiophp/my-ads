declare module 'archiver' {
  import type { Readable } from 'node:stream';

  type AppendSource = Buffer | Readable | NodeJS.ReadableStream;

  interface ArchiverOptions {
    zlib?: {
      level?: number;
    };
  }

  interface AppendOptions {
    name: string;
  }

  interface Archiver extends NodeJS.WritableStream {
    append(source: AppendSource, data: AppendOptions): Archiver;
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
    finalize(): Promise<void> | void;
    destroy(): void;
    on(event: 'error', handler: (error: Error) => void): this;
  }

  function archiver(format: 'zip', options?: ArchiverOptions): Archiver;

  export = archiver;
}
