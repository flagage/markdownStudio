declare module 'html-to-docx' {
  interface DocumentOptions {
    title?: string
    creator?: string
    lang?: string
  }

  export default function HTMLtoDOCX(
    html: string,
    header?: string | null,
    documentOptions?: DocumentOptions,
    footer?: string | null
  ): Promise<Buffer | Blob>
}
