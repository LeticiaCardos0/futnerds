// Fotos de cabeçalho do painel de país (public/nacoes/fotos/<iso2>.jpg).
// Todas do Wikimedia Commons, com licença livre — o crédito é exibido no painel.
export interface FotoPais { autor: string; licenca: string; fonte: string; }

export const FOTOS_PAIS: Record<string, FotoPais> = {
  ar: { autor: "Dpalma01", licenca: "CC BY-SA 4.0", fonte: "https://commons.wikimedia.org/wiki/File:Obelisco_de_Buenos_Aires_at_sunset.jpg" },
  br: { autor: "Donatas Dabravolskas", licenca: "CC BY-SA 4.0", fonte: "https://commons.wikimedia.org/wiki/File:Redentor_Over_Clouds_1.jpg" },
  de: { autor: "Thomas Wolf, www.foto-tw.de", licenca: "CC BY-SA 3.0", fonte: "https://commons.wikimedia.org/wiki/File:Brandenburger_Tor_nachts.jpg" },
  es: { autor: "Richard Mortel from Riyadh, Saudi Arabia", licenca: "CC BY 2.0", fonte: "https://commons.wikimedia.org/wiki/File:Sagrada_Familia,_Nativity_facade_(26)_(30489118703).jpg" },
  fr: { autor: "Chadi saad", licenca: "CC BY-SA 4.0", fonte: "https://commons.wikimedia.org/wiki/File:Tour_eiffel_paris-eiffel_tower.jpg" },
  gb: { autor: "Diliff", licenca: "CC BY 3.0", fonte: "https://commons.wikimedia.org/wiki/File:London_Thames_Sunset_panorama_-_Feb_2008.jpg" },
  it: { autor: "Wilfredor", licenca: "CC0", fonte: "https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome_and_Roman_forum.jpg" },
  nl: { autor: "Basile Morin", licenca: "CC BY-SA 4.0", fonte: "https://commons.wikimedia.org/wiki/File:Water_reflection_of_canal_houses_at_blue_hour_in_Damrak_Amsterdam_the_Netherlands.jpg" },
  pt: { autor: "Diego Delso", licenca: "CC BY-SA 3.0", fonte: "https://commons.wikimedia.org/wiki/File:Torre_de_Bel%C3%A9m,_Lisboa,_Portugal,_2012-05-12,_DD_16.JPG" },
  us: { autor: "Dmitry Avdeev", licenca: "CC BY-SA 3.0", fonte: "https://commons.wikimedia.org/wiki/File:Manhattan_from_Weehawken,_NJ.jpg" },
};
