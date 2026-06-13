declare global {
  const MINERVA_VERSION: string
  const MINERVA_CHANNEL: string
}

export const InstallationVersion = typeof MINERVA_VERSION === "string" ? MINERVA_VERSION : "local"
export const InstallationChannel = typeof MINERVA_CHANNEL === "string" ? MINERVA_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
