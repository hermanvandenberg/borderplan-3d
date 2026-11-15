// Gedeelde prompts voor het inlezen van een tekening en het opzoeken van plantgegevens.
// Wordt gebruikt door de app (ingevoegd bij de build) en door de server.

export const FORMS = "cane (rechtopstaande struik met rietachtige stengels), shrub (ronde struik), tree (meerstammige boom), spikes (bloemaren), daisy (schijfbloemen/madeliefachtig, ook anemoon/geum), buttons (kleine knopjes op draadstengels), umbel (schermen of gewelfde pluimen), grass (siergras), fern (varen), mound (lage bol met bloemen erover), feather (fijn naaldblad), airy (ijl met kleine sterbloempjes), ground (bodembedekker)";

export const PROMPT_PLAN = `Je krijgt foto's van een met de hand getekend beplantingsplan voor een tuinborder (eerste foto) en daarna foto's van de bijbehorende plantenlijst.
Taak: zet dit om in JSON.
1) "plants": elke regel van de lijst als {"nr":getal,"label":"naam zoals op de lijst","perVak":getal,"total":getal,"notes":"snoei-toelichting of lege string","cutMarch":true/false (kolom 'maart tot 15 cm afknippen' aangekruist),"rebloomCut":true/false}. Corrigeer spelfouten NIET in label.
2) "outline": de omtrek van de border als lijst [x,y] punten met de klok mee, 12 tot 40 punten.
3) "zones": elk getekend vak (cirkel of vlak) als {"p":[plantnummers in dat vak; "1/2" wordt [1,2]],"x":middelpunt,"y":middelpunt,"rx":halve breedte,"ry":halve diepte,"c":true als het een cirkel is}.
4) "north": als er een noordpijl op de tekening staat, de richting waarin die wijst in graden met de klok mee vanaf de bovenkant van het papier; anders null.
Coördinaten: corrigeer voor perspectief en scheefstand van de foto. x loopt van 0 (linkerkant border) tot 1 (rechterkant border). y loopt van 0 (achterrand, bovenkant tekening) naar beneden, in DEZELFDE eenheid als x (dus een border die 7x zo lang als diep is heeft y tot ongeveer 0.14).
Neem ieder vak op, ook kleine. Antwoord met alleen het JSON-object {"plants":[...],"outline":[...],"zones":[...],"north":...}.`;

export function promptPlants(list) {
  return `Geef tuinbouwkundige gegevens voor deze planten (Nederlands klimaat), zoals beschreven door RHS of gerenommeerde kwekerijen. Kleuren moeten zo precies mogelijk de echte kleur zijn, als hex.
Planten: ${list.map((p) => `${p.nr}: ${p.label}`).join("; ")}
Antwoord met alleen een JSON-object met per nummer: {"<nr>":{"name":"volledige botanische naam met cultivar","nl":"Nederlandse naam","form":één van [${FORMS}] (alleen het woord),"h":hoogte in m incl. bloei,"w":breedte in m,"leaf":"#hex bladkleur zomer","autumn":"#hex herfstkleur of null","flower":"#hex hoofdkleur bloem of null","flower2":"#hex tweede bloemkleur of null","center":"#hex hart van de bloem of null","bloom":[maandnummers],"winter":"evergreen"|"semi"|"stand"|"collapse"|"deciduous","seed":"#hex zaadhoofd of null","desc":"2 zinnen uiterlijk"}}`;
}
