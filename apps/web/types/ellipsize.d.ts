// The `ellipsize` package ships types at `types/index.d.ts`, but its
// package.json `exports` map only exposes `./src/index.js` for the "."
// entry, so bundler-mode module resolution can't find them automatically.
declare module "ellipsize" {
  type EllipsizeOptions = {
    ellipse?: string;
    chars?: string[];
    max?: number;
    truncate?: "middle" | boolean;
  };

  export function ellipsizeMiddle(
    str: string,
    max: number,
    ellipse: string,
    chars: string[]
  ): string;

  export default function ellipsize(str: string, max: number, opts?: EllipsizeOptions): string;
}
