import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { API_URL } from '../../../shared/api.util';
import { CidadeSemTime, ConfigPaisLiga } from '../../../shared/mapa-liga/config-liga';

/** Cidade com pelo menos um clube da liga — o rótulo vai no centro dela. */
export interface CidadeMapa {
  nome: string;
  lat: number;
  lng: number;
}

/** Uma entrada do JSON de localização. */
export interface ClubeLocalizacao {
  slug: string;
  /** Nomes como aparecem na base. Lista porque a base abrevia ("Spurs", "Man Utd"). */
  nomesBase: string[];
  cidade: string;
  estadio: string;
  /** Foto do estádio (Wikimedia Commons). Opcional. */
  imagemEstadio?: string;
  lat: number;
  lng: number;
  /** Opcional: sem cor, o mapa usa o verde do FutNerds. */
  cor?: string;
  corTexto?: string;
}

/** Forma do ClubeSaidaDto do backend (GET /api/times). */
interface TimeDaApi {
  id: number;
  nome: string;
  escudoUrl: string;
  overallMedio: number | null;
  quantidadeJogadores: number;
  valorElenco: number;
  idadeMedia: number | null;
}

interface ArquivoLocalizacao {
  ligaId: string;
  cidades: CidadeMapa[];
  clubes: ClubeLocalizacao[];
}

/** O JSON de config.cidadesUrl (scripts/gerar-cidades-referencia.js). */
interface ArquivoCidades {
  cidadesSemTime: CidadeSemTime[];
  cidadesVizinhas: CidadeSemTime[];
}

/** Clube da base já cruzado com a localização — é o que o mapa consome. */
export interface ClubeNoMapa {
  id: number;
  nome: string;
  escudoUrl: string;
  /** 100x100, para o pino e a lista do painel. Ver escudoMiniatura. */
  escudoMiniUrl: string;
  cidade: string;
  estadio: string;
  imagemEstadio?: string;
  lat: number;
  lng: number;
  cor: string;
  corTexto: string;
  // Estatísticas do elenco, direto do DTO de GET /api/times.
  overallMedio: number | null;
  quantidadeJogadores: number;
  valorElenco: number;
  idadeMedia: number | null;
}

/** Campos de GET /api/times/{id} que o painel direito usa. */
export interface DetalhesClube {
  fundacao: number | null;
}

export interface DadosMapaLiga {
  clubes: ClubeNoMapa[];
  /** Cidades com pelo menos um clube da liga. */
  cidades: CidadeMapa[];
  /**
   * Cidades sem clube (do país e dos vizinhos), já filtradas: sai da lista da
   * config qualquer uma que tenha clube NESTA liga. Filtrar em tempo de execução, e não apagar da
   * config, faz o mapa se ajustar sozinho quando os times mudam de divisão.
   */
  cidadesSemTime: CidadeSemTime[];
}

/** Verde do FutNerds, usado quando o clube não tem cor no JSON. */
const COR_PADRAO = '#3CB01A';
const COR_TEXTO_PADRAO = '#2A7F12';

/**
 * Mesma normalização do script gerador: minúsculo, sem acento, sem sufixo de
 * clube e sem pontuação. É o que permite casar "Spurs" com a entrada cujo
 * nomesBase traz "Spurs".
 */
function normalizar(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(f\.?c\.?|a\.?f\.?c\.?|football club)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Versão 100x100 (~13 kB) do escudo, para onde ele aparece pequeno: o pino do
 * mapa (38px) e a lista do painel. O original tem 512x512 e ~128 kB — nos 20
 * clubes eram ~2,5 MB baixados de uma vez só para desenhar bolinhas. Só o
 * TheSportsDB tem o sufixo /tiny; qualquer outro endereço segue como veio.
 */
function escudoMiniatura(url: string): string {
  return url?.startsWith('https://r2.thesportsdb.com/') ? `${url}/tiny` : url;
}

/** Distancia aproximada em km (haversine). */
function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Raio em que uma cidade sem time e considerada a MESMA de uma com time.
 *
 * Proposital baixo: os duplicados de idioma (Madrid/Madri, Sevilla/Sevilha,
 * Berlin/Berlim) ficam a 0,00 km, enquanto a cidade distinta mais proxima de
 * um clube esta a ~4 km (Leganes, ao lado de Madri). 3 km separa os dois casos
 * sem engolir vizinhas legitimas como Alicante ou Castellon.
 */
const KM_MESMA_CIDADE = 3;

/**
 * Raio em que uma cidade do JSON gerado é considerada a MESMA de uma da
 * config. Maior que KM_MESMA_CIDADE: o ponto do Natural Earth e o conferido à
 * mão no OpenStreetMap chegam a ficar a ~10 km (centro histórico x centro da
 * mancha urbana), e os nomes vêm em idiomas diferentes (Köln x Colônia).
 */
const KM_COMPLEMENTO = 15;

/**
 * Lista curada da config primeiro; do arquivo gerado só entra quem não tem
 * nome nem ponto repetido nela. A curadoria vence as disputas de espaço, já
 * que criarRotulos desempata pela ordem.
 *
 * Com lista curada, as extras descem um rank: a vista inicial continua a que
 * foi desenhada à mão, e o detalhe novo aparece conforme o zoom.
 */
function complementar(base: ArquivoCidades, extra: ArquivoCidades): ArquivoCidades {
  const todas = [...base.cidadesSemTime, ...base.cidadesVizinhas];
  const nomes = new Set(todas.map((c) => normalizar(c.nome)));
  const nova = (c: CidadeSemTime) =>
    !nomes.has(normalizar(c.nome)) && !todas.some((t) => distanciaKm(t, c) < KM_COMPLEMENTO);
  const rebaixar = (c: CidadeSemTime): CidadeSemTime =>
    todas.length ? { ...c, rank: c.rank === 1 ? 2 : 3 } : c;
  return {
    cidadesSemTime: [...base.cidadesSemTime, ...(extra.cidadesSemTime ?? []).filter(nova).map(rebaixar)],
    cidadesVizinhas: [...base.cidadesVizinhas, ...(extra.cidadesVizinhas ?? []).filter(nova).map(rebaixar)],
  };
}

@Injectable({ providedIn: 'root' })
export class LigaMapaService {
  private readonly http = inject(HttpClient);

  /**
   * Junta os clubes da base (fonte da verdade sobre quem está na liga) com o
   * JSON de localização (fonte da verdade sobre onde cada um fica).
   *
   * Clube sem localização não entra no mapa; entrada do JSON sem clube na base
   * é ignorada. Os dois casos viram um aviso agrupado no console — a página
   * continua funcionando de qualquer jeito.
   */
  carregar(config: ConfigPaisLiga): Observable<DadosMapaLiga> {
    const times$ = this.http.get<{ times: TimeDaApi[] }>(`${API_URL}/times`, {
      params: { liga: config.ligaNomeBase, size: 200 },
    });

    // O JSON é opcional: sem ele o mapa ainda sobe, só sem clube nenhum.
    const local$ = this.http.get<ArquivoLocalizacao>(config.clubesUrl).pipe(
      map((a) => a),
      // erro de rede/404 não pode derrubar a página
      catchErrorVazio(config.clubesUrl),
    );

    // Cidades de referência: as da config mais as do JSON gerado, quando a
    // config aponta um. Falha no JSON vira lista vazia — o mapa sobe com os
    // clubes e as cidades da config, só com menos nomes em serifa.
    const daConfig: ArquivoCidades = {
      cidadesSemTime: config.cidadesSemTime,
      cidadesVizinhas: config.cidadesVizinhas,
    };
    const referencia$: Observable<ArquivoCidades> = config.cidadesUrl
      ? this.http.get<ArquivoCidades>(config.cidadesUrl).pipe(
          map((arquivo) => complementar(daConfig, arquivo)),
          catchError(() => {
            console.warn(`FutNerds · não foi possível carregar ${config.cidadesUrl}. O mapa sobe sem as cidades de referência.`);
            return of(daConfig);
          }),
        )
      : of(daConfig);

    return forkJoin({ resp: times$, local: local$, ref: referencia$ }).pipe(
      map(({ resp, local, ref }) => this.cruzar(config, resp.times ?? [], local, ref)),
    );
  }

  /**
   * Fundação só existe em GET /api/times/{id} (o DTO da lista não traz).
   * Buscada sob demanda ao selecionar um clube, e não para os 20 de uma vez.
   */
  detalhes(id: number): Observable<DetalhesClube> {
    return this.http.get<DetalhesClube>(`${API_URL}/times/${id}`);
  }

  private cruzar(
    config: ConfigPaisLiga,
    daBase: TimeDaApi[],
    local: ArquivoLocalizacao,
    ref: ArquivoCidades,
  ): DadosMapaLiga {
    // índice: cada apelido de nomesBase aponta para a entrada
    const porNome = new Map<string, ClubeLocalizacao>();
    for (const c of local.clubes ?? []) {
      for (const alias of c.nomesBase ?? []) {
        const chave = normalizar(alias);
        if (chave) porNome.set(chave, c);
      }
    }

    const clubes: ClubeNoMapa[] = [];
    const semLocalizacao: string[] = [];
    const usados = new Set<string>();

    for (const time of daBase) {
      const loc = porNome.get(normalizar(time.nome));
      if (!loc) {
        semLocalizacao.push(time.nome);
        continue;
      }
      usados.add(loc.slug);
      clubes.push({
        id: time.id,
        nome: time.nome,
        escudoUrl: time.escudoUrl,
        escudoMiniUrl: escudoMiniatura(time.escudoUrl),
        cidade: loc.cidade,
        estadio: loc.estadio,
        imagemEstadio: loc.imagemEstadio,
        lat: loc.lat,
        lng: loc.lng,
        cor: loc.cor ?? COR_PADRAO,
        corTexto: loc.corTexto ?? COR_TEXTO_PADRAO,
        overallMedio: time.overallMedio ?? null,
        quantidadeJogadores: time.quantidadeJogadores ?? 0,
        valorElenco: time.valorElenco ?? 0,
        idadeMedia: time.idadeMedia ?? null,
      });
    }

    const orfas = (local.clubes ?? []).filter((c) => !usados.has(c.slug)).map((c) => c.slug);

    if (semLocalizacao.length > 0) {
      console.warn(
        `FutNerds · ${semLocalizacao.length} clube(s) da ${config.ligaNomeBase} sem localização ` +
          `(não aparecem no mapa). Adicione em ${config.clubesUrl}:\n  ` +
          semLocalizacao.join(', '),
      );
    }
    if (orfas.length > 0) {
      console.warn(
        `FutNerds · ${orfas.length} entrada(s) de ${config.clubesUrl} sem clube correspondente ` +
          `na base — provável rename na base, confira nomesBase:\n  ` +
          orfas.join(', '),
      );
    }

    // Só as cidades que de fato sobraram com clube no mapa.
    const comClube = new Set(clubes.map((c) => c.cidade));
    const cidades = (local.cidades ?? []).filter((c) => comClube.has(c.nome));

    // A config lista cidades "sem time" de forma fixa, mas isso muda a cada
    // temporada: Leeds, Sunderland, Ipswich, Coventry e Hull subiram para a
    // Premier League em 2026/27. Em vez de editar a config, tiro aqui quem já
    // aparece como cidade com clube.
    //
    // O filtro é por NOME e por DISTÂNCIA. Só por nome não basta: a lista da
    // config vem no idioma local ("Madrid", "Berlin") e o JSON usa o nome de
    // exibição em português ("Madri", "Berlim"), então a mesma cidade apareceria
    // duas vezes — uma em Rajdhani caixa alta e outra em serifada itálica, a
    // poucos pixels de distância.
    //
    // As vizinhas vão DEPOIS e passam pelo mesmo filtro. Depois porque a
    // ordenação em criarRotulos é estável: numa disputa de espaço, a cidade do
    // país da liga vence. Pelo filtro porque clube galês joga no sistema inglês
    // — se Cardiff, Swansea ou Wrexham subir, o nome não aparece duas vezes.
    const nomesComClube = new Set([...comClube].map(normalizar));
    const pontosComClube = cidades;
    const vizinhas = (ref.cidadesVizinhas ?? []).map((c) => ({ ...c, vizinha: true }));
    const cidadesSemTime = [...(ref.cidadesSemTime ?? []), ...vizinhas].filter((c) => {
      if (nomesComClube.has(normalizar(c.nome))) return false;
      return !pontosComClube.some((p) => distanciaKm(p, c) < KM_MESMA_CIDADE);
    });

    return { clubes, cidades, cidadesSemTime };
  }
}

/** Operador auxiliar: 404/erro de rede vira um arquivo vazio, com aviso. */
function catchErrorVazio(url: string) {
  return (fonte: Observable<ArquivoLocalizacao>) =>
    new Observable<ArquivoLocalizacao>((sub) => {
      const s = fonte.subscribe({
        next: (v) => sub.next(v),
        error: () => {
          console.warn(
            `FutNerds · não foi possível carregar ${url}. O mapa sobe sem os clubes.`,
          );
          sub.next({ ligaId: '', cidades: [], clubes: [] });
          sub.complete();
        },
        complete: () => sub.complete(),
      });
      return () => s.unsubscribe();
    });
}
