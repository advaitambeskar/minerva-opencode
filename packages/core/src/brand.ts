export const APP_NAME = "minerva"
export const PRODUCT_NAME = "Minerva"
export const CLI_NAME = "minerva"
export const NPM_PACKAGE = "minerva-ai"
export const GITHUB_OWNER = "advaitambeskar"
export const GITHUB_REPO = "minerva-opencode"
export const URL_SCHEME = "minerva"
export const CONFIG_NAMES = ["minerva.jsonc", "minerva.json"] as const

export function envName(name: string) {
  return `MINERVA_${name}`
}
