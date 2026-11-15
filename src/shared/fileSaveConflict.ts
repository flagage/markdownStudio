export function canWriteFile(
  currentContent: string,
  expectedContent: string,
  overwrite: boolean
): boolean {
  return overwrite || currentContent === expectedContent
}
