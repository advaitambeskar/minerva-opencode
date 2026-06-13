import { $ } from "bun"

await $`bun ./scripts/copy-icons.ts ${process.env.MINERVA_CHANNEL ?? "dev"}`

await $`cd ../minerva && bun script/build-node.ts`
