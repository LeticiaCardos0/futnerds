export function obterCaminhoIconePlaystyle(trait: string): string {
  const nomeArquivo = trait
    .trim()
    .replace(/\s*\+$/, '+');
  return `/playstyles/${nomeArquivo}.png`;
}
